"use client";

import { ChevronRight, Layers3, MoreHorizontal, Plus, Search } from "lucide-react";
import type { RefObject } from "react";
import {
  InlineSearchCombobox,
  InlineSearchPicker,
} from "@/components/inline-search-picker";
import {
  inventoryToolbarCatalogGroupClass,
  inventoryToolbarChevronButtonClass,
  inventoryToolbarDividerClass,
  inventoryToolbarGroupClass,
  inventoryToolbarPickerShellClass,
  inventoryToolbarPickerWidthClass,
  inventoryToolbarRowClass,
  inventoryToolbarSubcategoryPickerWidthClass,
  InventoryToolbarIconButton,
} from "@/components/inventory/inventory-toolbar-icon-button";
import { ONBOARDING_TARGETS } from "@/lib/onboarding/coach-targets";
import type { CategoryConfig } from "@/lib/inventory-tree";
import { Pencil } from "lucide-react";

type EmbeddedPickerOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
};

type InventoryOverview = {
  itemCount: number;
  warehouseQty: number;
  assignedQty: number;
  attentionCount: number;
  activeAssignments: number;
};

export type InventoryStructureEmbeddedShellProps = {
  headerSlot?: React.ReactNode;
  workspaceNavSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  truckPanel?: React.ReactNode;
  itemsPanel: React.ReactNode;
  categoryConfigs: CategoryConfig[];
  showStructureOptions: boolean;
  optionsOpen: boolean;
  truckTabOpen: boolean;
  truckQty: number;
  onTruckTabChange?: (open: boolean) => void;
  selectedCategory: string;
  selectedCategoryData: CategoryConfig | null;
  selectedSubcategoryId: string;
  embeddedCategoryOptions: EmbeddedPickerOption[];
  embeddedSubcategoryOptions: EmbeddedPickerOption[];
  embeddedItemOptions: EmbeddedPickerOption[];
  hasEmbeddedSubcategories: boolean;
  hasSubcategorySelection: boolean;
  showEmbeddedSubcategoryPicker: boolean;
  embeddedSubcategoryOpen: boolean;
  setEmbeddedSubcategoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  itemQuery: string;
  setItemQuery: (value: string) => void;
  itemSearchPlaceholder: string;
  showNewItemForm: boolean;
  toolbarMenuOpen: boolean;
  setToolbarMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toolbarEndSlot?: React.ReactNode;
  inventoryOverview: InventoryOverview;
  newItemAnchorRef: RefObject<HTMLDivElement | null>;
  newItemButtonRef: RefObject<HTMLButtonElement | null>;
  toolbarMenuButtonRef: RefObject<HTMLButtonElement | null>;
  toolbarMenuRef: RefObject<HTMLDivElement | null>;
  onOpenStructureMenu: (trigger: HTMLButtonElement, mode: "create" | "manage") => void;
  onSelectCategory: (name: string) => void;
  onSelectSubcategory: (id: string) => void;
  onClearSubcategory: () => void;
  onBeginAddItem: () => void;
  onUpdateNewItemPopoverPosition: () => void;
  editingCategoryName: string;
  setEditingCategoryName: (value: string) => void;
};

export function InventoryStructureEmbeddedShell({
  headerSlot,
  workspaceNavSlot,
  footerSlot,
  truckPanel,
  itemsPanel,
  categoryConfigs,
  showStructureOptions,
  optionsOpen,
  truckTabOpen,
  truckQty,
  onTruckTabChange,
  selectedCategory,
  selectedCategoryData,
  selectedSubcategoryId,
  embeddedCategoryOptions,
  embeddedSubcategoryOptions,
  embeddedItemOptions,
  hasEmbeddedSubcategories,
  hasSubcategorySelection,
  showEmbeddedSubcategoryPicker,
  embeddedSubcategoryOpen,
  setEmbeddedSubcategoryOpen,
  itemQuery,
  setItemQuery,
  itemSearchPlaceholder,
  showNewItemForm,
  toolbarMenuOpen,
  setToolbarMenuOpen,
  toolbarEndSlot,
  inventoryOverview,
  newItemAnchorRef,
  newItemButtonRef,
  toolbarMenuButtonRef,
  toolbarMenuRef,
  onOpenStructureMenu,
  onSelectCategory,
  onSelectSubcategory,
  onClearSubcategory,
  onBeginAddItem,
  onUpdateNewItemPopoverPosition,
  setEditingCategoryName,
}: InventoryStructureEmbeddedShellProps) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-black bg-[#25302c] shadow-[0_10px_26px_rgba(0,0,0,0.22)]">
      <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 overflow-x-hidden border-b border-black/70 bg-[#1a2320] px-3 py-2 sm:px-4">
        <div className={`${inventoryToolbarRowClass} min-w-0 flex-1 basis-[min(100%,18rem)]`}>
          {headerSlot ? (
            <div className={inventoryToolbarGroupClass}>{headerSlot}</div>
          ) : null}
          {!truckTabOpen && categoryConfigs.length ? (
            <div className={inventoryToolbarCatalogGroupClass}>
              {showStructureOptions ? (
                <InventoryToolbarIconButton
                  icon={Pencil}
                  label="Editar categorías y subcategorías"
                  tone={optionsOpen ? "active" : "default"}
                  ariaExpanded={optionsOpen}
                  ariaHaspopup="dialog"
                  onClick={(event) => {
                    if (selectedCategoryData) {
                      setEditingCategoryName(selectedCategoryData.name);
                    }
                    onOpenStructureMenu(event.currentTarget, "create");
                  }}
                />
              ) : null}
              {showStructureOptions ? (
                <span className={inventoryToolbarDividerClass} aria-hidden />
              ) : null}
              <InlineSearchPicker
                value={selectedCategory}
                onChange={onSelectCategory}
                placeholder="Categoría"
                searchPlaceholder="Buscar categoría…"
                emptyLabel="Sin categorías"
                ariaLabel="Categoría de inventario"
                leadingIcon={<Layers3 className="h-4 w-4" aria-hidden />}
                options={embeddedCategoryOptions}
                className="min-w-0 flex-1"
                shellClassName={`${inventoryToolbarPickerShellClass} ${inventoryToolbarPickerWidthClass}`}
              />
              {hasEmbeddedSubcategories ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasSubcategorySelection) {
                        setEmbeddedSubcategoryOpen((current) => !current);
                      }
                    }}
                    disabled={hasSubcategorySelection}
                    aria-expanded={showEmbeddedSubcategoryPicker}
                    aria-label={
                      showEmbeddedSubcategoryPicker
                        ? "Ocultar subcategorías"
                        : "Mostrar subcategorías"
                    }
                    title={
                      showEmbeddedSubcategoryPicker
                        ? "Ocultar subcategorías"
                        : "Mostrar subcategorías"
                    }
                    className={`${inventoryToolbarChevronButtonClass} ${
                      showEmbeddedSubcategoryPicker ? "text-emerald-300" : ""
                    }`}
                  >
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition-transform ${
                        showEmbeddedSubcategoryPicker ? "rotate-90" : ""
                      }`}
                      aria-hidden
                    />
                  </button>
                  {showEmbeddedSubcategoryPicker ? (
                    <InlineSearchPicker
                      value={selectedSubcategoryId}
                      onChange={(nextId) => {
                        if (!nextId) {
                          onClearSubcategory();
                          return;
                        }

                        onSelectSubcategory(nextId);
                        setEmbeddedSubcategoryOpen(true);
                      }}
                      placeholder="Subcategoría"
                      searchPlaceholder="Buscar subcategoría…"
                      emptyLabel="Sin coincidencias"
                      ariaLabel="Subcategoría"
                      leadingIcon={<Layers3 className="h-4 w-4" aria-hidden />}
                      options={embeddedSubcategoryOptions}
                      className="min-w-0 shrink-0"
                      shellClassName={`${inventoryToolbarPickerShellClass} ${inventoryToolbarSubcategoryPickerWidthClass}`}
                      openOnMount={embeddedSubcategoryOpen && !hasSubcategorySelection}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
          {!truckTabOpen && selectedCategoryData ? (
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden rounded-lg border border-black bg-[#141a18] p-1">
              <InlineSearchCombobox
                value={itemQuery}
                onChange={setItemQuery}
                placeholder={itemSearchPlaceholder}
                emptyLabel="Sin items"
                ariaLabel="Buscar items"
                leadingIcon={<Search className="h-4 w-4" aria-hidden />}
                options={embeddedItemOptions}
                className="min-w-0"
                shellClassName={`${inventoryToolbarPickerShellClass} ${inventoryToolbarPickerWidthClass}`}
                persistent
              />
            </div>
          ) : null}
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
          {!truckTabOpen && showStructureOptions ? (
            <div className={inventoryToolbarGroupClass}>
              <div ref={newItemAnchorRef} className="relative">
                {!showNewItemForm ? (
                  <InventoryToolbarIconButton
                    buttonRef={newItemButtonRef}
                    icon={Plus}
                    label="Agregar artículo"
                    showLabel
                    visibleLabel="Agregar"
                    tone="primary"
                    disabled={!selectedCategoryData}
                    ariaExpanded={false}
                    ariaHaspopup="dialog"
                    onboardingTarget={ONBOARDING_TARGETS.INVENTORY_STRUCTURE_MENU}
                    onClick={() => {
                      onUpdateNewItemPopoverPosition();
                      onBeginAddItem();
                    }}
                  />
                ) : null}
              </div>
              <div className="relative">
                <InventoryToolbarIconButton
                  buttonRef={toolbarMenuButtonRef}
                  icon={MoreHorizontal}
                  label="Operación de inventario"
                  tone={toolbarMenuOpen ? "active" : "default"}
                  ariaExpanded={toolbarMenuOpen}
                  ariaHaspopup="menu"
                  onClick={() => setToolbarMenuOpen((current) => !current)}
                />
                {toolbarMenuOpen && toolbarEndSlot ? (
                  <div
                    ref={toolbarMenuRef}
                    role="menu"
                    onClick={(event) => {
                      if (
                        (event.target as HTMLElement).closest(
                          "[data-inventory-toolbar-menu-action]",
                        )
                      ) {
                        setToolbarMenuOpen(false);
                      }
                    }}
                    aria-label="Operación de inventario"
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-[120] w-[min(19rem,calc(100vw-1rem))] rounded-xl border border-black bg-[#101820] p-2 shadow-[0_18px_45px_rgba(0,0,0,0.5)]"
                  >
                    {toolbarEndSlot}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <dl className="flex min-w-0 max-w-full flex-wrap overflow-hidden rounded-xl border border-black bg-[#17201d]">
            <div className="min-w-[4.25rem] flex-1 border-r border-black/70 px-2 py-1.5">
              <dt className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                Artículos
              </dt>
              <dd className="mt-0.5 text-sm font-black tabular-nums text-slate-100">
                {inventoryOverview.itemCount}
              </dd>
            </div>
            <button
              type="button"
              className={`min-w-[4.25rem] flex-1 border-r border-black/70 px-2 py-1.5 text-left transition ${
                !truckTabOpen ? "bg-emerald-400/10" : "hover:bg-white/[0.03]"
              }`}
              onClick={() => onTruckTabChange?.(false)}
              aria-pressed={!truckTabOpen}
            >
              <dt className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                En bodega
              </dt>
              <dd className="mt-0.5 text-sm font-black tabular-nums text-emerald-300">
                {inventoryOverview.warehouseQty}
              </dd>
            </button>
            <button
              type="button"
              className={`min-w-[4.25rem] flex-1 border-r border-black/70 px-2 py-1.5 text-left transition ${
                truckTabOpen ? "bg-sky-400/10" : "hover:bg-white/[0.03]"
              }`}
              onClick={() => onTruckTabChange?.(true)}
              aria-pressed={truckTabOpen}
            >
              <dt className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                En camiones
              </dt>
              <dd className="mt-0.5 text-sm font-black tabular-nums text-sky-300">
                {truckQty}
              </dd>
            </button>
            <div className="min-w-[4.25rem] flex-1 border-r border-black/70 px-2 py-1.5">
              <dt className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                Con empleados
              </dt>
              <dd className="mt-0.5 flex items-baseline gap-1 text-sm font-black tabular-nums text-violet-300">
                {inventoryOverview.assignedQty}
                {inventoryOverview.activeAssignments ? (
                  <span className="text-[9px] font-bold text-violet-300">
                    {inventoryOverview.activeAssignments} entregas
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="min-w-[4.25rem] flex-1 px-2 py-1.5">
              <dt className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                Por revisar
              </dt>
              <dd
                className={`mt-0.5 text-sm font-black tabular-nums ${
                  inventoryOverview.attentionCount ? "text-amber-300" : "text-slate-300"
                }`}
              >
                {inventoryOverview.attentionCount}
              </dd>
            </div>
          </dl>
        </div>
        {workspaceNavSlot ? (
          <div className="min-w-0 max-w-full flex-1 basis-full xl:basis-auto">{workspaceNavSlot}</div>
        ) : null}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {truckTabOpen && truckPanel ? truckPanel : itemsPanel}
      </div>

      {footerSlot ? (
        <div className="shrink-0 border-t border-black/70 bg-[#1a2320]">
          {footerSlot}
        </div>
      ) : null}
    </section>
  );
}
