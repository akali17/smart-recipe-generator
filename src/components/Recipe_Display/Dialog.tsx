import { useEffect, useState } from 'react';
import { DialogBackdrop, Dialog, DialogPanel } from '@headlessui/react';
import Image from 'next/image';
import { EllipsisVerticalIcon } from '@heroicons/react/16/solid'
import useActionPopover from '../Hooks/useActionPopover';
import RecipeCard from '../RecipeCard';
import Loading from '../Loading';
import { ActionPopover } from './ActionPopover';
import UserLink from '../UserLink';
import { formatDate } from '../../utils/utils';
import { ExtendedRecipe } from '../../types';

interface RecipeDialogProps {
    isOpen: boolean;
    close: () => void;
    recipe: ExtendedRecipe | null;
    removeRecipe: ({ message, error }: { message: string, error: string }) => void;
    handleRecipeListUpdate: (r: ExtendedRecipe | null, deleteId?: string | undefined) => void
}

export default function RecipeDisplayModal({ isOpen, close, recipe, removeRecipe, handleRecipeListUpdate }: RecipeDialogProps) {
    const [isLoading, setIsLoading] = useState(false)

    const updateRecipe = (audioLink: string) => {
        if (!recipe) return null
        handleRecipeListUpdate({
            ...recipe,
            audio: audioLink
        })
    }

    const {
        handleClone,
        handleCopy,
        handlePlayRecipe,
        killAudio,
        handleDeleteDialog,
        handleDeleteRecipe,
        linkCopied,
        isPlayingAudio,
        isLoadingAudio,
        isDeleteDialogOpen
    } = useActionPopover(recipe, updateRecipe);

    useEffect(() => {
        // Stop audio playback when the modal is closed
        if (!isOpen) {
            killAudio()
        }
    }, [isOpen, killAudio]);

    const deleteAndRemoveRecipe = async () => {
        try {
            setIsLoading(true)
            const { message, error } = await handleDeleteRecipe();
            setIsLoading(false)
            removeRecipe({ message, error })
        } catch (error) {
            console.error(error)
        }
    }

    if (!recipe) return null;

    return (
        <>
            <Dialog open={isOpen} as="div" className="relative z-modal focus:outline-none" onClose={close}>
                <DialogBackdrop className="fixed inset-0 bg-black/50" />
                <div className="fixed inset-0 z-overlay w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <DialogPanel
                            className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl bg-white p-1 backdrop-blur-2xl duration-300 ease-out"
                        >
                            <div className="flex flex-col items-center">
                                {
                                    <div className="flex justify-between items-start w-full">
                                        <div className="flex items-center mb-2 mt-2 ml-2 bg-gray-100 p-2 rounded-lg">
                                            <Image
                                                className="h-10 w-10 rounded-full"
                                                src={
                                                    recipe.owner.image ||
                                                    "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
                                                }
                                                alt={`Profile-Picture-${recipe.owner.name}`}
                                                width={25}
                                                height={25}
                                            />
                                            <div className="ml-4">
                                                <p className="text-lg font-semibold text-gray-900">
                                                    <UserLink
                                                        userId={recipe.owner._id}
                                                        name={recipe.owner.name}
                                                    />
                                                </p>
                                                <p className="text-sm text-gray-500">{formatDate(recipe.createdAt)}</p>
                                            </div>
                                        </div>
                                        <ActionPopover
                                            handlers={{
                                                handleClone,
                                                handleCopy,
                                                closeDialog: close,
                                                handlePlayRecipe,
                                                deleteDialog: handleDeleteDialog,
                                                deleteRecipe: deleteAndRemoveRecipe,
                                            }}
                                            states={{
                                                hasAudio: Boolean(recipe.audio),
                                                isLoadingAudio,
                                                isPlayingAudio,
                                                linkCopied,
                                                isDeleteDialogOpen,
                                            }}
                                            data={{
                                                recipe,
                                                buttonType: <EllipsisVerticalIcon className="h-6 w-6 text-gray-700" />,
                                            }}

                                        />
                                    </div>
                                }
                                {
                                                                            isLoading ?
                                            <Loading />
                                            :
                                            <>
                                            {/* Nút tìm video hướng dẫn YouTube */}
                                            <div className="w-full px-3 pb-2">
                                                <a
                                                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.name + ' recipe how to cook')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all"
                                                >
                                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8z"/>
                                                        <path d="M9.7 15.5V8.5l6.3 3.5-6.3 3.5z" fill="white"/>
                                                    </svg>
                                                    Xem video hướng dẫn nấu {recipe.name}
                                                </a>
                                            </div>
                                            <RecipeCard recipe={recipe} selectedRecipes={[]} removeMargin isModalView />
                                            </>
                                            }
                            </div>
                        </DialogPanel>
                    </div>
                </div>
            </Dialog>
        </>
    );
}
