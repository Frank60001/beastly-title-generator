
import { ImageUploader } from "@/components/ImageUploader";
import { TitleCard } from "@/components/TitleCard";
import { Card } from "@/components/ui/card";
import { formatError } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export default function Index() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [titles, setTitles] = useState<string[]>([]);

  const handleImageSelect = async (file: File) => {
    setIsAnalyzing(true);
    try {
      // TODO: Implement AI analysis
      // This is where we'll add the Gemini and OpenAI integration
      const mockTitles = [
        "I Gave $10,000 to Anyone Who Could Solve This Puzzle In 24 Hours!",
        "Last to Leave This Luxury Island Wins a Tesla!",
        "I Bought Everything in 5 Stores and Gave It All Away!",
        "Spending 24 Hours in the World's Most Expensive Hotel!",
        "First to Find the Golden Ticket Wins $50,000!"
      ];
      setTitles(mockTitles);
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Video Title Generator
          </h1>
          <p className="text-gray-600">
            Upload an image and get viral video title suggestions
          </p>
        </div>

        <ImageUploader 
          onImageSelect={handleImageSelect}
          isLoading={isAnalyzing}
        />

        {titles.length > 0 && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Top Picks</h2>
              <div className="space-y-3">
                {titles.slice(0, 2).map((title, index) => (
                  <TitleCard key={index} title={title} />
                ))}
              </div>
            </Card>

            {titles.length > 2 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">More Options</h2>
                <div className="space-y-3">
                  {titles.slice(2).map((title, index) => (
                    <TitleCard key={index + 2} title={title} />
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
