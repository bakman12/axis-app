import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Clock, Utensils, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function SavedRecipesPanel() {
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const { data: savedRecipes = [], refetch } = useQuery({
    queryKey: ['savedRecipes'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return user.saved_recipes || [];
    }
  });

  const handleRemove = async (index) => {
    try {
      const user = await base44.auth.me();
      const updated = [...(user.saved_recipes || [])];
      updated.splice(index, 1);
      await base44.auth.updateMe({ saved_recipes: updated });
      refetch();
      toast.success('Recipe removed');
    } catch (error) {
      toast.error('Failed to remove recipe');
    }
  };

  if (savedRecipes.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ChefHat className="w-5 h-5 text-green-500" />
            Saved Recipes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {savedRecipes.map((recipe, idx) => (
            <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm dark:text-white">{recipe.name}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{recipe.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemove(idx)}
                  className="h-8 w-8 p-0 ml-2"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {recipe.prepTime}
                </span>
                <Badge variant="outline" className="text-xs">
                  {recipe.difficulty}
                </Badge>
                <span className="flex items-center gap-1">
                  <Utensils className="w-3 h-3" />
                  {recipe.servings} servings
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2"
                onClick={() => setSelectedRecipe(recipe)}
              >
                View Recipe
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRecipe?.name}</DialogTitle>
          </DialogHeader>
          {selectedRecipe && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRecipe.description}</p>
              
              {selectedRecipe.healthBenefits && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                  <p className="text-sm text-green-900 dark:text-green-200">
                    <strong>Health Benefits:</strong> {selectedRecipe.healthBenefits}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Ingredients</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {selectedRecipe.ingredients?.map((ing, idx) => (
                    <li key={idx} className="text-sm">{ing}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Instructions</h4>
                <ol className="list-decimal pl-5 space-y-2">
                  {selectedRecipe.instructions?.map((step, idx) => (
                    <li key={idx} className="text-sm">{step}</li>
                  ))}
                </ol>
              </div>

              {selectedRecipe.tips && selectedRecipe.tips.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Tips</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedRecipe.tips.map((tip, idx) => (
                      <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedRecipe.nutrition && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold mb-2">Nutrition (per serving)</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Calories:</span>{' '}
                      <span className="font-medium">{selectedRecipe.nutrition.calories}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Protein:</span>{' '}
                      <span className="font-medium">{selectedRecipe.nutrition.protein}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Carbs:</span>{' '}
                      <span className="font-medium">{selectedRecipe.nutrition.carbs}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}