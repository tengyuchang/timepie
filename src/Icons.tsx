import {
  Moon,
  BriefcaseBusiness,
  TrainFront,
  Dumbbell,
  Utensils,
  Heart,
  UserRound,
  Sparkles,
  Ellipsis,
} from "lucide-react";
import type { Category } from "./planner";
export const categoryIcons = {
  Sleep: Moon,
  Work: BriefcaseBusiness,
  Commute: TrainFront,
  Exercise: Dumbbell,
  Meals: Utensils,
  Family: Heart,
  Personal: UserRound,
  Leisure: Sparkles,
  Other: Ellipsis,
};
export function CategoryIcon({
  category,
  size = 16,
  ...props
}: {
  category: Category;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = categoryIcons[category];
  return <Icon size={size} strokeWidth={1.7} {...props} />;
}
