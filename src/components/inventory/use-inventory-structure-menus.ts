"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { useNotify } from "@/hooks/use-notify";
import { STRUCTURE_MENU_WIDTH } from "@/lib/inventory-structure-utils";
import type { CategoryConfig } from "@/lib/inventory-tree";

type UseInventoryStructureMenusParams = {
  categoryConfigs: CategoryConfig[];
  showStructureOptions: boolean;
  embedded: boolean;
  selectedCategory: string;
  selectedCategoryData: CategoryConfig | null;
  notify: ReturnType<typeof useNotify>;
  setOpenSubcategoryInput: (value: string) => void;
};

export function useInventoryStructureMenus({
  categoryConfigs,
  showStructureOptions,
  embedded,
  selectedCategory,
  selectedCategoryData,
  notify,
  setOpenSubcategoryInput,
}: UseInventoryStructureMenusParams) {
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [toolbarMenuOpen, setToolbarMenuOpen] = useState(false);
  const [structureMenuMode, setStructureMenuMode] = useState<"create" | "manage">(
    "create",
  );
  const [structureMenuPosition, setStructureMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [structureMenuMounted, setStructureMenuMounted] = useState(false);
  const structureButtonRef = useRef<HTMLButtonElement>(null);
  const toolbarMenuButtonRef = useRef<HTMLButtonElement>(null);
  const toolbarMenuRef = useRef<HTMLDivElement>(null);
  const newItemButtonRef = useRef<HTMLButtonElement>(null);
  const newItemAnchorRef = useRef<HTMLDivElement>(null);
  const structurePanelRef = useRef<HTMLDivElement>(null);
  const newItemPopoverRef = useRef<HTMLDivElement>(null);
  const emptyCategoryFormRef = useRef<HTMLDivElement>(null);
  const [newItemPopoverPosition, setNewItemPopoverPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [showNewItemForm, setShowNewItemForm] = useState(false);

  const structureEditingEnabled = optionsOpen;

  useEffect(() => {
    queueMicrotask(() => {
      if (!categoryConfigs.length && showStructureOptions) {
        setOptionsOpen(true);
      }
    });
  }, [categoryConfigs.length, showStructureOptions]);

  useEffect(() => {
    if (!structureEditingEnabled) {
      queueMicrotask(() => {
        setOpenSubcategoryInput("");
        if (categoryConfigs.length > 0) {
          setShowNewCategoryInput(false);
        }
      });
    }
  }, [categoryConfigs.length, setOpenSubcategoryInput, structureEditingEnabled]);

  function openStructureOptions(opts?: {
    addCategory?: boolean;
    addItem?: boolean;
  }) {
    setStructureMenuMode("create");
    setOptionsOpen(true);

    if (opts?.addCategory) {
      setShowNewCategoryInput(true);
      setShowNewItemForm(false);
    }

    if (opts?.addItem) {
      setShowNewItemForm(true);
      setShowNewCategoryInput(false);
    }
  }

  function beginAddItem() {
    setShowNewCategoryInput(false);
    setOpenSubcategoryInput("");
    setShowNewItemForm(true);
    setOptionsOpen(false);
  }

  const updateStructureMenuPosition = useCallback(() => {
    const trigger = structureButtonRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const viewportWidth = document.documentElement.clientWidth;
    const panelWidth = Math.min(STRUCTURE_MENU_WIDTH, viewportWidth - margin * 2);
    const left = Math.min(
      Math.max(margin, rect.right - panelWidth),
      viewportWidth - panelWidth - margin,
    );

    setStructureMenuPosition({
      top: rect.bottom + 6,
      left,
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setStructureMenuMounted(true);
    });
  }, []);

  useEffect(() => {
    if (!embedded || !optionsOpen) {
      return;
    }

    updateStructureMenuPosition();

    window.addEventListener("resize", updateStructureMenuPosition);
    window.addEventListener("scroll", updateStructureMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateStructureMenuPosition);
      window.removeEventListener("scroll", updateStructureMenuPosition, true);
    };
  }, [embedded, optionsOpen, updateStructureMenuPosition]);

  const updateNewItemPopoverPosition = useCallback(() => {
    const trigger =
      toolbarMenuButtonRef.current ??
      newItemButtonRef.current ??
      newItemAnchorRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const viewportWidth = document.documentElement.clientWidth;
    const panelWidth = Math.min(STRUCTURE_MENU_WIDTH, viewportWidth - margin * 2);
    const left = Math.min(
      Math.max(margin, rect.right - panelWidth),
      viewportWidth - panelWidth - margin,
    );

    setNewItemPopoverPosition({
      top: rect.bottom + 6,
      left,
    });
  }, []);

  useEffect(() => {
    if (!showNewItemForm) {
      return;
    }

    updateNewItemPopoverPosition();

    window.addEventListener("resize", updateNewItemPopoverPosition);
    window.addEventListener("scroll", updateNewItemPopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updateNewItemPopoverPosition);
      window.removeEventListener("scroll", updateNewItemPopoverPosition, true);
    };
  }, [showNewItemForm, updateNewItemPopoverPosition]);

  useEffect(() => {
    if (!embedded || !optionsOpen) {
      return;
    }

    function handlePointerDown(event: globalThis.MouseEvent) {
      const target = event.target as Node;

      if (
        structureButtonRef.current?.contains(target) ||
        newItemButtonRef.current?.contains(target) ||
        newItemAnchorRef.current?.contains(target) ||
        structurePanelRef.current?.contains(target) ||
        newItemPopoverRef.current?.contains(target) ||
        emptyCategoryFormRef.current?.contains(target)
      ) {
        return;
      }

      if (!categoryConfigs.length) {
        return;
      }

      setOptionsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!categoryConfigs.length && showNewCategoryInput) {
          setShowNewCategoryInput(false);
          return;
        }

        setOptionsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [categoryConfigs.length, embedded, optionsOpen, showNewCategoryInput]);

  useEffect(() => {
    if (!toolbarMenuOpen) {
      return;
    }

    function closeToolbarMenu(event: globalThis.MouseEvent) {
      const target = event.target as Node;

      if (
        toolbarMenuRef.current?.contains(target) ||
        toolbarMenuButtonRef.current?.contains(target)
      ) {
        return;
      }

      setToolbarMenuOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setToolbarMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", closeToolbarMenu);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("mousedown", closeToolbarMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [toolbarMenuOpen]);

  function beginAddSubcategory() {
    if (!selectedCategoryData) {
      notify.error("Elige una categoría primero.");
      return;
    }

    setShowNewCategoryInput(false);
    setShowNewItemForm(false);
    setOpenSubcategoryInput(selectedCategory);
    setStructureMenuMode("create");
    setOptionsOpen(true);
  }

  function beginAddCategory() {
    setShowNewItemForm(false);
    setOpenSubcategoryInput("");
    setShowNewCategoryInput(true);
    setStructureMenuMode("create");
    setOptionsOpen(true);
  }

  function openStructureMenu(
    trigger: HTMLButtonElement,
    mode: "create" | "manage",
  ) {
    structureButtonRef.current = trigger;
    setStructureMenuMode(mode);
    setOptionsOpen(true);
  }

  const optionsSummary = useMemo(() => {
    if (!categoryConfigs.length) {
      return "Agregar categoría o item";
    }

    return `Estructura · ${categoryConfigs.length} categorías`;
  }, [categoryConfigs.length]);

  return {
    showNewCategoryInput,
    setShowNewCategoryInput,
    optionsOpen,
    setOptionsOpen,
    toolbarMenuOpen,
    setToolbarMenuOpen,
    structureMenuMode,
    structureMenuPosition,
    structureMenuMounted,
    structureButtonRef,
    toolbarMenuButtonRef,
    toolbarMenuRef,
    newItemButtonRef,
    newItemAnchorRef,
    structurePanelRef,
    newItemPopoverRef,
    emptyCategoryFormRef,
    newItemPopoverPosition,
    showNewItemForm,
    setShowNewItemForm,
    structureEditingEnabled,
    openStructureOptions,
    beginAddItem,
    updateStructureMenuPosition,
    updateNewItemPopoverPosition,
    beginAddSubcategory,
    beginAddCategory,
    openStructureMenu,
    optionsSummary,
  };
}
