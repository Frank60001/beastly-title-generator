
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface TitleCardProps {
  title: string;
  className?: string;
}

export const TitleCard = ({ title, className = "" }: TitleCardProps) => {
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(title);
    toast.success("Title copied to clipboard!");
  };

  return (
    <Card className="p-4 flex items-center justify-between gap-4 bg-[#333] border-[#444] hover:shadow-xl transition-all duration-200">
      <p className={`text-lg font-bold flex-1 break-words ${className}`}>{title}</p>
      <Button
        variant="ghost"
        size="icon"
        onClick={copyToClipboard}
        className="shrink-0 text-gray-400 hover:text-white hover:bg-[#444]"
      >
        <Copy className="w-4 h-4" />
      </Button>
    </Card>
  );
};
