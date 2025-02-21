
import { ImageUploader } from "@/components/ImageUploader";
import { TitleCard } from "@/components/TitleCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatError } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { Youtube, Upload, Wand2 } from "lucide-react";

export default function Index() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [urlTitles, setUrlTitles] = useState<string[]>([]);
  const [imageTitles, setImageTitles] = useState<string[]>([]);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);

  const handleUrlGenerate = async () => {
    if (!youtubeUrl) {
      toast.error("Please enter a YouTube URL");
      return;
    }
    setIsAnalyzing(true);
    try {
      // TODO: Implement AI analysis
      const mockTitles = [
        "I Gave $10,000 to Anyone Who Could Solve This Puzzle In 24 Hours!",
        "Last to Leave This Luxury Island Wins a Tesla!",
        "I Bought Everything in 5 Stores and Gave It All Away!"
      ];
      setUrlTitles(mockTitles);
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageSelect = async (file: File) => {
    setIsAnalyzing(true);
    try {
      // TODO: Implement AI analysis
      const mockTitles = [
        "First Person to Find the Hidden $50,000 WINS IT!",
        "Surviving 100 Hours in a Haunted Mansion!",
        "I Built the World's Largest Pizza and Fed an Entire City!"
      ];
      setImageTitles(mockTitles);
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateThumbnail = async () => {
    if (!customPrompt) {
      toast.error("Please enter a prompt for the thumbnail");
      return;
    }
    setIsAnalyzing(true);
    try {
      // TODO: Implement AI thumbnail generation
      // Mockup for now
      setGeneratedThumbnail("https://placehold.co/1280x720/1a1f2c/ffffff/png?text=Generated+Thumbnail");
      toast.success("Thumbnail generated successfully!");
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const titleColors = ["text-red-500", "text-yellow-500", "text-blue-500"];

  return (
    <div className="min-h-screen bg-[#1A1F2C] py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 text-transparent bg-clip-text animate-gradient">
            Thumbnail Generator
          </h1>
          <p className="text-gray-400 text-lg">
            Create viral thumbnails and titles in seconds!
          </p>
        </div>

        <div className="grid gap-8">
          <Card className="p-6 bg-[#222222] border-[#333] shadow-2xl">
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Generate from YouTube URL</h2>
                <div className="flex gap-3">
                  <Input
                    placeholder="Paste YouTube URL here"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="bg-[#333] border-[#444] text-white"
                  />
                  <Button
                    onClick={handleUrlGenerate}
                    disabled={isAnalyzing}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold"
                  >
                    <Youtube className="w-4 h-4 mr-2" />
                    Generate Ideas
                  </Button>
                </div>
              </div>

              {urlTitles.length > 0 && (
                <div className="space-y-3">
                  {urlTitles.map((title, index) => (
                    <TitleCard
                      key={index}
                      title={title}
                      className={`${titleColors[index]} hover:scale-102 transition-transform`}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-[#222222] border-[#333] shadow-2xl">
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Upload Custom Image</h2>
              <ImageUploader
                onImageSelect={handleImageSelect}
                isLoading={isAnalyzing}
              />

              {imageTitles.length > 0 && (
                <div className="space-y-3">
                  {imageTitles.map((title, index) => (
                    <TitleCard
                      key={index}
                      title={title}
                      className={`${titleColors[index]} hover:scale-102 transition-transform`}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-[#222222] border-[#333] shadow-2xl">
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Generate Thumbnail</h2>
              <div className="space-y-4">
                <Input
                  placeholder="Enter your thumbnail prompt here"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="bg-[#333] border-[#444] text-white"
                />
                <Button
                  onClick={generateThumbnail}
                  disabled={isAnalyzing}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Thumbnail
                </Button>
              </div>

              {generatedThumbnail && (
                <div className="rounded-lg overflow-hidden shadow-xl">
                  <img
                    src={generatedThumbnail}
                    alt="Generated thumbnail"
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
