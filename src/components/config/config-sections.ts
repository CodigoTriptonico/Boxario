import { Building2, Clock, ShoppingBag, Palette, Truck, type LucideIcon } from "lucide-react";
import { CONFIG_SECTION_LABELS } from "@/lib/config-section-labels";

export type ConfigSection =
  | "menu"
  | "organization"
  | "prices"
  | "distributors"
  | "appearance"
  | "timeclock";

export const configSections: ConfigSection[] = [
  "menu",
  "organization",
  "prices",
  "distributors",
  "appearance",
  "timeclock",
];

const configSectionCards = [
  {
    id: "organization" as ConfigSection,
    title: CONFIG_SECTION_LABELS.organization.title,
    text: CONFIG_SECTION_LABELS.organization.text,
    icon: Building2,
  },
  {
    id: "prices" as ConfigSection,
    title: CONFIG_SECTION_LABELS.prices.title,
    text: CONFIG_SECTION_LABELS.prices.text,
    icon: ShoppingBag,
  },
  {
    id: "distributors" as ConfigSection,
    title: CONFIG_SECTION_LABELS.distributors.title,
    text: CONFIG_SECTION_LABELS.distributors.text,
    icon: Truck,
  },
  {
    id: "appearance" as ConfigSection,
    title: CONFIG_SECTION_LABELS.appearance.title,
    text: CONFIG_SECTION_LABELS.appearance.text,
    icon: Palette,
  },
  {
    id: "timeclock" as ConfigSection,
    title: CONFIG_SECTION_LABELS.timeclock.title,
    text: CONFIG_SECTION_LABELS.timeclock.text,
    icon: Clock,
  },
] satisfies Array<{
  id: ConfigSection;
  title: string;
  text: string;
  icon: LucideIcon;
}>;

export const configSectionById = new Map(
  configSectionCards.map((section) => [section.id, section]),
);
