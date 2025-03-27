import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ClassificationDetailsProps {
  category: 'reply' | 'read' | 'archive';
  confidence: number;
  reasoning?: string;
}

export function ClassificationDetails({ 
  category, 
  confidence, 
  reasoning 
}: ClassificationDetailsProps) {
  const getColorByCategory = () => {
    switch (category) {
      case 'reply': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'read': return 'bg-green-100 text-green-800 border-green-300';
      case 'archive': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card className="p-4 mb-4 border-l-4 shadow-sm" style={{ borderLeftColor: 
      category === 'reply' ? '#3b82f6' : 
      category === 'read' ? '#10b981' : '#6b7280' 
    }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <Badge className={getColorByCategory()}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Badge>
          <Badge className={`ml-2 ${getConfidenceColor()}`}>
            {Math.round(confidence * 100)}% confidence
          </Badge>
        </div>
      </div>
      {reasoning && (
        <div className="text-sm text-gray-600 mt-2">
          <p className="font-medium">AI reasoning:</p>
          <p className="italic">{reasoning}</p>
        </div>
      )}
    </Card>
  );
}
