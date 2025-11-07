import { useState, useEffect } from "react";
import { 
  listComicImages, 
  uploadComicImage, 
  setComicCover, 
  deleteComicImage,
  getComicImageUrl,
  type ComicImage 
} from "@/lib/comicImages";
import { toast } from "sonner";

export function ComicImagesManager({ comicId }: { comicId: string }) {
  const [images, setImages] = useState<ComicImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  async function load() {
    try {
      const data = await listComicImages(comicId);
      setImages(data);
    } catch (error) {
      console.error("Failed to load images:", error);
      toast.error("Failed to load images");
    }
  }

  useEffect(() => {
    load();
  }, [comicId]);

  async function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    
    setIsUploading(true);
    try {
      const MAX_FILES = 20;
      const MAX_SIZE_MB = 10;
      const allowed = ["image/jpeg", "image/png", "image/webp"];

      const filesToUpload = Array.from(files).slice(0, MAX_FILES);
      
      // Validate files
      for (const file of filesToUpload) {
        if (!allowed.includes(file.type)) {
          toast.error(`Invalid file type: ${file.name}`);
          continue;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          toast.error(`File too large: ${file.name} (max ${MAX_SIZE_MB}MB)`);
          continue;
        }
      }

      // Upload each file
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const sortOrder = images.length + i;
        const isCover = images.length === 0 && i === 0; // First image is cover if no images exist
        
        await uploadComicImage(comicId, file, isCover, sortOrder);
      }
      
      await load();
      toast.success(`Uploaded ${filesToUpload.length} image(s)`);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload images");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSetCover(id: string) {
    try {
      await setComicCover(comicId, id);
      await load();
      toast.success("Cover image updated");
    } catch (error) {
      console.error("Failed to set cover:", error);
      toast.error("Failed to set cover");
    }
  }

  async function handleRemoveImage(id: string, storagePath: string) {
    if (!confirm("Delete this image?")) return;
    
    try {
      await deleteComicImage(id, storagePath);
      await load();
      toast.success("Image deleted");
    } catch (error) {
      console.error("Failed to delete image:", error);
      toast.error("Failed to delete image");
    }
  }

  return (
    <div>
      <label className="block mb-2 font-semibold text-foreground">Photos</label>
      <input
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={(e) => onFilesSelected(e.target.files)}
        className="block w-full text-sm text-foreground
          file:mr-4 file:py-2 file:px-4
          file:rounded file:border-0
          file:text-sm file:font-semibold
          file:bg-primary file:text-primary-foreground
          hover:file:bg-primary/90
          cursor-pointer"
      />
      {isUploading && <p className="text-muted-foreground mt-2">Uploading…</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
        {images.map((img) => (
          <ImageItem
            key={img.id}
            img={img}
            onMakeCover={() => handleSetCover(img.id)}
            onDelete={() => handleRemoveImage(img.id, img.storage_path)}
          />
        ))}
      </div>

      {images.length === 0 && !isUploading && (
        <p className="text-muted-foreground text-sm mt-4">No images yet. Upload some photos!</p>
      )}
    </div>
  );
}

function ImageItem({ 
  img, 
  onMakeCover, 
  onDelete 
}: { 
  img: ComicImage; 
  onMakeCover: () => void; 
  onDelete: () => void; 
}) {
  const url = getComicImageUrl(img.storage_path);

  return (
    <div className="relative group">
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
        <img 
          src={url} 
          alt="" 
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {img.is_cover && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
            Cover
          </div>
        )}
      </div>
      
      <div className="mt-2 flex items-center justify-between text-xs gap-2">
        <button 
          onClick={onMakeCover} 
          className="text-primary hover:underline flex-1 text-left"
          disabled={img.is_cover}
        >
          {img.is_cover ? "Cover ✓" : "Make cover"}
        </button>
        <button 
          onClick={onDelete} 
          className="text-destructive hover:underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
