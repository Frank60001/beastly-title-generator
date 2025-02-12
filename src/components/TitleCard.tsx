
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface TitleCardProps {
  title: string;
}

export const TitleCard = ({ title }: TitleCardProps) => {
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(title);
    toast.success("Title copied to clipboard!");
  };

  return (
    <Card className="p-4 flex items-center justify-between gap-4 hover:shadow-lg transition-shadow">
      <p className="text-sm font-medium flex-1">{title}</p>
      <Button variant="ghost" size="icon" onClick={copyToClipboard}>
        <Copy className="w-4 h-4" />
      </Button>
    </Card>
  );
};
