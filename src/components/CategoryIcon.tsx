import React from 'react';
import {
  Utensils,
  Home,
  Car,
  HeartPulse,
  Coffee,
  ShoppingBag,
  Tv,
  GraduationCap,
  Receipt,
  MoreHorizontal,
  Briefcase,
  Laptop,
  TrendingUp,
  ArrowDownLeft,
  ShieldCheck,
  Plane,
  Tag,
  DollarSign,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Utensils,
  Home,
  Car,
  HeartPulse,
  Coffee,
  ShoppingBag,
  Tv,
  GraduationCap,
  Receipt,
  MoreHorizontal,
  Briefcase,
  Laptop,
  TrendingUp,
  ArrowDownLeft,
  ShieldCheck,
  Plane,
  Tag,
  DollarSign,
};

interface CategoryIconProps {
  name: string;
  className?: string;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  className = 'w-4 h-4',
  color,
}) => {
  const IconComponent = ICON_MAP[name] || Tag;
  return <IconComponent className={className} style={color ? { color } : undefined} />;
};
