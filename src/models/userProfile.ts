import mongoose, { Schema, Document } from 'mongoose';

export interface IUserProfile extends Document {
  userId: string;
  spiceLevel: 'mild' | 'medium' | 'hot';
  dislikedIngredients: string[];
  dietaryNotes: string;
  likedRecipeIds: string[];
  cookedHistory: {
    ingredients: string[];
    recipeName: string;
    date: Date;
  }[];
}

const UserProfileSchema = new Schema<IUserProfile>({
  userId: { type: String, required: true, unique: true },
  spiceLevel: { type: String, enum: ['mild', 'medium', 'hot'], default: 'medium' },
  dislikedIngredients: { type: [String], default: [] },
  dietaryNotes: { type: String, default: '' },
  likedRecipeIds: { type: [String], default: [] },
  cookedHistory: [{
    ingredients: [String],
    recipeName: String,
    date: { type: Date, default: Date.now }
  }],
  allergies: { type: [String], default: [] },
  preferredCuisines: { type: [String], default: [] },
  servingSize: { type: Number, default: 2 },
}, { timestamps: true });

export default mongoose.models.UserProfile ||
  mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);