import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MobileSelect from '@/components/ui/mobile-select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const commonConditions = [
  'Diabetes', 'Hypertension', 'Asthma', 'COPD', 'Heart Disease',
  'Arthritis', 'Depression', 'Anxiety', 'Thyroid Disorder', 'Osteoporosis'
];

const commonDietaryRestrictions = [
  'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Low sodium',
  'Low sugar', 'Kosher', 'Halal', 'Nut allergy', 'Shellfish allergy'
];

const exerciseTypes = [
  'Walking', 'Running', 'Cycling', 'Swimming', 'Yoga',
  'Strength training', 'Pilates', 'Dancing', 'Hiking', 'Sports'
];

export default function HealthProfileSetup({ onComplete }) {
  const queryClient = useQueryClient();

  const { data: existingProfile } = useQuery({
    queryKey: ['healthProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.HealthProfile.list();
      return profiles[0] || null;
    }
  });

  const [profile, setProfile] = useState({
    health_conditions: [],
    fitness_level: 'beginner',
    dietary_restrictions: [],
    exercise_preferences: [],
    goals: '',
    notes: ''
  });

  const [customCondition, setCustomCondition] = useState('');
  const [customDiet, setCustomDiet] = useState('');
  const [customExercise, setCustomExercise] = useState('');

  useEffect(() => {
    if (existingProfile) {
      setProfile(existingProfile);
    }
  }, [existingProfile]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingProfile) {
        return await base44.entities.HealthProfile.update(existingProfile.id, data);
      } else {
        return await base44.entities.HealthProfile.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthProfile'] });
      toast.success('Health profile saved');
      onComplete?.();
    },
    onError: () => {
      toast.error('Failed to save profile');
    }
  });

  const addItem = (field, value, setter) => {
    if (value.trim()) {
      setProfile(p => ({
        ...p,
        [field]: [...(p[field] || []), value.trim()]
      }));
      setter('');
    }
  };

  const removeItem = (field, value) => {
    setProfile(p => ({
      ...p,
      [field]: p[field].filter(item => item !== value)
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(profile);
  };

  return (
    <div className="space-y-6 py-4">
      {/* Health Conditions */}
      <div>
        <Label>Health Conditions</Label>
        <p className="text-xs text-gray-500 mb-2">
          Help your coach create safe workout plans
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {commonConditions.map(condition => (
            <Badge
              key={condition}
              variant={profile.health_conditions?.includes(condition) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                if (profile.health_conditions?.includes(condition)) {
                  removeItem('health_conditions', condition);
                } else {
                  setProfile(p => ({
                    ...p,
                    health_conditions: [...(p.health_conditions || []), condition]
                  }));
                }
              }}
            >
              {condition}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add custom condition..."
            value={customCondition}
            onChange={(e) => setCustomCondition(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addItem('health_conditions', customCondition, setCustomCondition)}
          />
          <Button
            variant="outline"
            onClick={() => addItem('health_conditions', customCondition, setCustomCondition)}
          >
            Add
          </Button>
        </div>
        {profile.health_conditions?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {profile.health_conditions.map(condition => (
              <Badge key={condition} className="gap-1">
                {condition}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeItem('health_conditions', condition)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Fitness Level */}
      <div>
        <Label>Fitness Level</Label>
        <MobileSelect
          value={profile.fitness_level}
          onValueChange={(value) => setProfile(p => ({ ...p, fitness_level: value }))}
          options={[
            { value: 'beginner', label: 'Beginner - Just starting out' },
            { value: 'intermediate', label: 'Intermediate - Regular exercise' },
            { value: 'advanced', label: 'Advanced - Very active' }
          ]}
          placeholder="Select fitness level"
        />
      </div>

      {/* Exercise Preferences */}
      <div>
        <Label>Exercise Preferences</Label>
        <p className="text-xs text-gray-500 mb-2">
          What types of exercise do you enjoy?
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {exerciseTypes.map(type => (
            <Badge
              key={type}
              variant={profile.exercise_preferences?.includes(type) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                if (profile.exercise_preferences?.includes(type)) {
                  removeItem('exercise_preferences', type);
                } else {
                  setProfile(p => ({
                    ...p,
                    exercise_preferences: [...(p.exercise_preferences || []), type]
                  }));
                }
              }}
            >
              {type}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add custom exercise..."
            value={customExercise}
            onChange={(e) => setCustomExercise(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addItem('exercise_preferences', customExercise, setCustomExercise)}
          />
          <Button
            variant="outline"
            onClick={() => addItem('exercise_preferences', customExercise, setCustomExercise)}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Dietary Restrictions */}
      <div>
        <Label>Dietary Restrictions</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {commonDietaryRestrictions.map(diet => (
            <Badge
              key={diet}
              variant={profile.dietary_restrictions?.includes(diet) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                if (profile.dietary_restrictions?.includes(diet)) {
                  removeItem('dietary_restrictions', diet);
                } else {
                  setProfile(p => ({
                    ...p,
                    dietary_restrictions: [...(p.dietary_restrictions || []), diet]
                  }));
                }
              }}
            >
              {diet}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add custom restriction..."
            value={customDiet}
            onChange={(e) => setCustomDiet(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addItem('dietary_restrictions', customDiet, setCustomDiet)}
          />
          <Button
            variant="outline"
            onClick={() => addItem('dietary_restrictions', customDiet, setCustomDiet)}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Goals */}
      <div>
        <Label>Health & Fitness Goals</Label>
        <Textarea
          placeholder="e.g., Improve energy levels, lose weight, build strength..."
          value={profile.goals}
          onChange={(e) => setProfile(p => ({ ...p, goals: e.target.value }))}
          rows={3}
        />
      </div>

      {/* Additional Notes */}
      <div>
        <Label>Additional Notes</Label>
        <Textarea
          placeholder="Any other health information your coach should know..."
          value={profile.notes}
          onChange={(e) => setProfile(p => ({ ...p, notes: e.target.value }))}
          rows={3}
        />
      </div>

      <Button
        className="w-full"
        onClick={handleSave}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
      </Button>
    </div>
  );
}