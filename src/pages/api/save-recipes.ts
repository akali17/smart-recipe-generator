import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { generateImages, generateRecipeTags } from '../../lib/openai';
import { uploadImagesToS3 } from '../../lib/awss3';
import { apiMiddleware } from '../../lib/apiMiddleware';
import { connectDB } from '../../lib/mongodb';
import recipe from '../../models/recipe';
import { Recipe, UploadReturnType, ExtendedRecipe } from '../../types';

/**
 * Helper function to get the S3 link for an uploaded image.
 * @param uploadResults - The results of the S3 upload operation.
 * @param location - The location identifier for the image.
 * @returns The URL of the image in S3 or a fallback image URL.
 */
const getS3Link = (uploadResults: UploadReturnType[] | null, location: string) => {
    const fallbackImg = '/logo.svg';
    if (!uploadResults) return fallbackImg;
    const filteredResult = uploadResults.filter(result => result.location === location);
    if (filteredResult[0]?.uploaded) {
        return `https://smart-recipe-generator.s3.amazonaws.com/${location}`;
    }
    return fallbackImg;
};

/**
 * API handler for generating images for recipes, uploading them to S3, and saving the recipes to MongoDB.
 * @param req - The Next.js API request object.
 * @param res - The Next.js API response object.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse, session: any) => {
    try {
        // Extract recipes from the request body
        const { recipes } = req.body;
        const recipeNames = recipes.map(({ name, ingredients }: Recipe) => ({ name, ingredients }));

        // Generate images using OpenAI
        console.info('Getting images from OpenAI...');
        const imageResults = await generateImages(recipeNames, session.user.id);
        
        // Prepare images for uploading to S3
        const openaiImagesArray = imageResults.map((result, idx) => {
            const dataUriPrefix = 'data:image/png;base64,';
            const isBase64DataUri = result.imgLink?.startsWith(dataUriPrefix);
            const b64Data = isBase64DataUri ? result.imgLink.slice(dataUriPrefix.length) : '';

            return {
                originalImgLink: isBase64DataUri ? undefined : result.imgLink,
                imageBuffer: isBase64DataUri ? Buffer.from(b64Data, 'base64') : undefined,
                userId: session.user.id,
                location: recipes[idx].openaiPromptId
            };
        });

        // Upload images to S3
        console.info('Uploading OpenAI images to S3...');
        const uploadResults = await uploadImagesToS3(openaiImagesArray);

                const updatedRecipes = recipes.map((r: Recipe, idx: number) => {
            const s3Link = getS3Link(uploadResults, r.openaiPromptId);
            // Nếu S3 upload thất bại, dùng ảnh base64 từ DALL·E trực tiếp
            const imgLink = s3Link === '/logo.svg' 
                ? (imageResults[idx]?.imgLink || '/logo.svg')
                : s3Link;
            return {
                ...r,
                owner: new mongoose.Types.ObjectId(session.user.id),
                imgLink,
                openaiPromptId: r.openaiPromptId.split('-')[0]
            };
        });

        // Connect to MongoDB and save recipes
        await connectDB();
        const savedRecipes = await recipe.insertMany(updatedRecipes);
        console.info(`Successfully saved ${recipes.length} recipes to MongoDB`);

        // Run `generateRecipeTags` asynchronously in the background
        savedRecipes.forEach((r) => {
            generateRecipeTags(r as ExtendedRecipe, session.user.id)
                .catch((error) => console.error(`Failed to generate tags for recipe ${r.name}:`, error));
        });

      // Lưu lịch sử nấu ăn vào UserProfile
        try {
            const UserProfile = (await import('../../models/userProfile')).default;
            const historyEntries = recipes.map((r: Recipe) => ({
                recipeName: r.name,
                ingredients: r.ingredients.map((i: any) => i.name),
                date: new Date(),
            }));
            await UserProfile.findOneAndUpdate(
                { userId: session.user.id },
                {
                    $push: {
                        cookedHistory: {
                            $each: historyEntries,
                            $slice: -20 // Chỉ giữ 20 món gần nhất
                        }
                    }
                },
                { upsert: true }
            );
        } catch (e) {
            console.warn('Could not save cooked history:', e);
        }

        // Respond with success message
        res.status(200).json({ status: 'Saved Recipes and generated the Images!' });
    } catch (error) {
        // Handle any errors that occur during the process
        console.error('Failed to send response:', error);
        res.status(500).json({ error: 'Failed to save recipes' });
    }
};

export default apiMiddleware(['POST'], handler);
