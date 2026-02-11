import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, ChefHat, Heart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RecipeTile({ recipe, index }) {
  const difficultyColors = {
    'Easy': 'bg-green-100 text-green-800 border-green-200',
    'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Hard': 'bg-orange-100 text-orange-800 border-orange-200'
  };

  return (
    <Card className="border-2 border-blue-100 hover:border-blue-200 transition-all hover:shadow-md bg-gradient-to-br from-white to-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
                {index}
              </div>
              <CardTitle className="text-base">{recipe.name}</CardTitle>
            </div>
            <p className="text-sm text-gray-600 mt-1">{recipe.description}</p>
          </div>
          <Badge 
            variant="outline" 
            className={cn("text-xs font-medium border", difficultyColors[recipe.difficulty] || difficultyColors['Medium'])}
          >
            {recipe.difficulty}
          </Badge>
        </div>

        {/* Recipe Meta Info */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Prep: {recipe.prepTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <ChefHat className="w-3 h-3" />
            <span>Cook: {recipe.cookTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{recipe.servings} servings</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Health Benefits */}
        {recipe.healthBenefits && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Heart className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-green-900 mb-1">Health Benefits</p>
                <p className="text-xs text-green-700">{recipe.healthBenefits}</p>
              </div>
            </div>
          </div>
        )}

        {/* Condition-Specific Notes */}
        {recipe.conditionNotes && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-900 mb-1">For Your Conditions</p>
                <p className="text-xs text-blue-700">{recipe.conditionNotes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Ingredients */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">🛒 Ingredients</p>
          <ul className="space-y-1">
            {recipe.ingredients?.map((ingredient, idx) => (
              <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>{ingredient}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">👨‍🍳 Instructions</p>
          <ol className="space-y-2">
            {recipe.instructions?.map((step, idx) => (
              <li key={idx} className="text-xs text-gray-600 flex gap-2">
                <span className="font-semibold text-blue-600 flex-shrink-0">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Tips */}
        {recipe.tips && recipe.tips.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-900 mb-2">💡 Chef's Tips</p>
            <ul className="space-y-1">
              {recipe.tips.map((tip, idx) => (
                <li key={idx} className="text-xs text-amber-800 flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Nutrition Info */}
        {recipe.nutrition && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-700 mb-2">📊 Nutrition (per serving)</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {Object.entries(recipe.nutrition).map(([key, value]) => (
                <div key={key} className="text-center">
                  <p className="font-semibold text-gray-900">{value}</p>
                  <p className="text-gray-500 capitalize">{key}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}