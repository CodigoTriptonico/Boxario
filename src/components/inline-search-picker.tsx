"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { insetShellClass } from "@/components/ui-blocks";
import { useFloatingPickerLifecycle } from "@/hooks/use-floating-picker-lifecycle";

export type InlineSearchPickerOption = {
  value: string;
  label: string;
  searchText?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  /** No cambia el valor; solo dispara onSelectOption (p. ej. ir a crear país). */
  action?: boolean;
  /** Visible pero no seleccionable (p. ej. ya agregado al país). */
  disabled?: boolean;
  /** Submenú tipo Windows (`>`): hijos seleccionables. */
  children?: InlineSearchPickerOption[];
};

type PanelPosition = {
  top: number;
  left: number;
  width: number;
};

const PANEL_MIN_WIDTH = 200;
const PANEL_CHAR_WIDTH = 7.2;
const PANEL_HORIZONTAL_PADDING = 48;

export function resolveInlineSearchPanelWidth(
  triggerWidth: number,
  labels: readonly string[],
  viewportWidth = 1280,
) {
  const longest = labels.reduce((max, label) => Math.max(max, label.length), 0);
  const estimated = Math.ceil(longest * PANEL_CHAR_WIDTH + PANEL_HORIZONTAL_PADDING);
  const viewportMax = Math.max(PANEL_MIN_WIDTH, viewportWidth - 16);

  return Math.min(Math.max(PANEL_MIN_WIDTH, triggerWidth, estimated), viewportMax);
}

export function findInlineSearchPickerOption(
  options: readonly InlineSearchPickerOption[],
  value: string,
): InlineSearchPickerOption | undefined {
  const clean = value.trim();
  if (!clean) {
    return undefined;
  }

  for (const option of options) {
    if (option.children?.length) {
      const child = option.children.find((entry) => entry.value === clean);
      if (child) {
        return child.value === option.value
          ? option
          : {
              ...child,
              label: `${option.label} · ${child.label}`,
              searchText: `${option.label} ${child.label} ${child.searchText ?? ""}`,
            };
      }
    }

    if (option.value === clean) {
      return option;
    }
  }

  return undefined;
}

function optionSearchHaystack(option: InlineSearchPickerOption) {
  const childText = (option.children || [])
    .map((child) => `${child.label} ${child.searchText ?? ""}`)
    .join(" ");
  return `${option.label} ${option.searchText ?? ""} ${childText}`.toLowerCase();
}

function filterInlineSearchPickerOptions(
  options: readonly InlineSearchPickerOption[],
  query: string,
) {
  const normalized = normalizeSearch(query);

  if (!normalized) {
    return [...options];
  }

  const matches: InlineSearchPickerOption[] = [];

  for (const option of options) {
    if (!option.children?.length) {
      if (optionSearchHaystack(option).includes(normalized)) {
        matches.push(option);
      }
      continue;
    }

    const matchingChildren = option.children.filter((child) =>
      `${option.label} ${child.label} ${child.searchText ?? ""}`
        .toLowerCase()
        .includes(normalized),
    );

    if (matchingChildren.length) {
      for (const child of matchingChildren) {
        matches.push({
          ...child,
          label:
            child.value === option.value
              ? option.label
              : `${option.label} · ${child.label}`,
          searchText: `${option.label} ${child.label}`,
        });
      }
    } else if (optionSearchHaystack(option).includes(normalized)) {
      matches.push(option);
    }
  }

  return matches;
}

const shellBaseClass =
  `${insetShellClass} box-border inline-flex h-9 max-w-full items-center gap-2 rounded-lg border border-solid px-2.5 bg-surface-inset`;

function shellStateClass(active: boolean, disabled: boolean) {
  if (disabled) {
    return "cursor-not-allowed border-black opacity-60";
  }

  return active ? "border-emerald-500/60" : "border-black";
}

const fieldClass =
  "inset-field min-w-0 flex-1 h-full border-0 bg-transparent p-0 text-sm font-black leading-5 outline-none";

const trailingSlotClass =
  "inline-flex h-4 w-4 shrink-0 items-center justify-center";

function subscribeToDomReady() {
  return () => {};
}

function getDomReadySnapshot() {
  return typeof document !== "undefined";
}

function getServerDomReadySnapshot() {
  return false;
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function useInlinePickerState({
  disabled,
  onClose,
}: {
  disabled: boolean;
  onClose?: () => void;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [lockedWidth, setLockedWidth] = useState<number | undefined>();
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const mounted = useSyncExternalStore(
    subscribeToDomReady,
    getDomReadySnapshot,
    getServerDomReadySnapshot,
  );

  const updatePanelPosition = useCallback(() => {
    const trigger = rootRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    setPanelPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(PANEL_MIN_WIDTH, rect.width),
    });
  }, []);

  const openPanel = useCallback(() => {
    if (disabled) {
      return;
    }
    if (rootRef.current) {
      setLockedWidth(rootRef.current.getBoundingClientRect().width);
    }
    setOpen(true);
  }, [disabled]);

  const closePanel = useCallback(() => {
    setOpen(false);
    setLockedWidth(undefined);
    onClose?.();
  }, [onClose]);

  useFloatingPickerLifecycle({
    open,
    updatePosition: updatePanelPosition,
    close: closePanel,
    rootRef,
    panelRef,
    searchRef,
  });

  return {
    closePanel,
    listboxId,
    lockedWidth,
    mounted,
    open,
    openPanel,
    panelPosition,
    panelRef,
    rootRef,
    searchRef,
  };
}

function InlineOptionsPanel({
  emptyLabel,
  listboxId,
  options,
  panelPosition,
  panelRef,
  panelWidth,
  selectedValue,
  onSelectOption,
}: {
  emptyLabel: string;
  listboxId: string;
  options: InlineSearchPickerOption[];
  panelPosition: PanelPosition;
  panelRef: RefObject<HTMLDivElement | null>;
  panelWidth: number;
  selectedValue: string;
  onSelectOption: (option: InlineSearchPickerOption) => void;
}) {
  const [openSubmenuValue, setOpenSubmenuValue] = useState<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState<PanelPosition | null>(null);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const openSubmenu = useCallback((option: InlineSearchPickerOption) => {
    if (!option.children?.length) {
      setOpenSubmenuValue(null);
      setSubmenuPosition(null);
      return;
    }

    const button = optionRefs.current[option.value];
    const rect = button?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const width = resolveInlineSearchPanelWidth(
      160,
      option.children.map((child) => child.label),
    );
    const left = Math.min(rect.right - 4, window.innerWidth - width - 8);
    const top = Math.min(rect.top, window.innerHeight - 8 - option.children.length * 40);

    setOpenSubmenuValue(option.value);
    setSubmenuPosition({ top: Math.max(8, top), left: Math.max(8, left), width });
  }, []);

  const openSubmenuOption = options.find((option) => option.value === openSubmenuValue);

  return (
    <div
      ref={panelRef}
      id={listboxId}
      role="listbox"
      data-inline-search-picker-panel
      className="fixed z-[170] overflow-visible rounded-lg border border-black bg-[#101820] shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
      style={{
        top: panelPosition.top,
        left: panelPosition.left,
        width: panelWidth,
      }}
    >
      <ul className="max-h-52 overflow-y-auto overflow-x-visible py-1">
        {options.length ? (
          options.map((option) => {
            const hasChildren = Boolean(option.children?.length);
            const selected =
              option.value === selectedValue ||
              option.children?.some((child) => child.value === selectedValue);
            const isDisabled = Boolean(option.disabled);
            const submenuOpen = openSubmenuValue === option.value;

            return (
              <li key={`${option.value}:${option.label}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={Boolean(selected)}
                  aria-disabled={isDisabled}
                  disabled={isDisabled}
                  ref={(element) => {
                    optionRefs.current[option.value] = element;
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => {
                    if (hasChildren) {
                      openSubmenu(option);
                    } else {
                      setOpenSubmenuValue(null);
                      setSubmenuPosition(null);
                    }
                  }}
                  onClick={() => {
                    if (hasChildren) {
                      // Parent click selects the whole bucket; hover opens the submenu.
                      onSelectOption(option);
                      return;
                    }

                    onSelectOption(option);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-bold transition ${
                    isDisabled
                      ? "cursor-not-allowed text-slate-600"
                      : option.action
                        ? "text-emerald-300 hover:bg-emerald-400/10"
                        : selected || submenuOpen
                          ? "bg-emerald-400/15 text-emerald-100"
                          : "text-slate-200 hover:bg-surface-card-header/80"
                  }`}
                >
                  {option.icon ? <span className="shrink-0">{option.icon}</span> : null}
                  <span className="min-w-0 flex-1 whitespace-normal break-words capitalize">
                    {option.label}
                  </span>
                  {option.trailing ? (
                    <span className="shrink-0">{option.trailing}</span>
                  ) : null}
                  {hasChildren ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })
        ) : (
          <li className="px-3 py-4 text-center text-sm font-bold text-slate-500">
            {emptyLabel}
          </li>
        )}
      </ul>

      {openSubmenuOption?.children?.length && submenuPosition ? (
        <div
          role="menu"
          data-inline-search-picker-submenu
          className="fixed z-[180] overflow-hidden rounded-lg border border-black bg-[#101820] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          style={{
            top: submenuPosition.top,
            left: submenuPosition.left,
            width: submenuPosition.width,
          }}
          onMouseDown={(event) => event.preventDefault()}
        >
          {openSubmenuOption.children.map((child) => {
            const selected = child.value === selectedValue;
            return (
              <button
                key={`${child.value}:${child.label}`}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => onSelectOption(child)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-bold transition ${
                  selected
                    ? "bg-emerald-400/15 text-emerald-100"
                    : "text-slate-200 hover:bg-surface-card-header/80"
                }`}
              >
                <span className="min-w-0 flex-1 whitespace-normal break-words capitalize">
                  {child.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export type InlineSearchPickerProps = {
  options: InlineSearchPickerOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  compact?: boolean;
  leadingIcon?: ReactNode;
  className?: string;
  ariaLabel?: string;
  minWidthClass?: string;
  disabled?: boolean;
  shellClassName?: string;
  onSelectOption?: (option: InlineSearchPickerOption) => void;
  formatSelectedLabel?: (
    option: InlineSearchPickerOption | undefined,
    placeholder: string,
  ) => string;
  /** Abre el panel al montar (p. ej. dentro de un popover recién abierto). */
  openOnMount?: boolean;
};

export function InlineSearchPicker({
  options,
  value,
  onChange,
  placeholder = "Elegir…",
  searchPlaceholder = "Buscar…",
  emptyLabel = "Sin coincidencias",
  compact = true,
  leadingIcon,
  className = "",
  ariaLabel,
  minWidthClass = "min-w-[11rem] sm:min-w-[14rem]",
  disabled = false,
  shellClassName,
  onSelectOption,
  formatSelectedLabel,
  openOnMount = false,
}: InlineSearchPickerProps) {
  const [query, setQuery] = useState("");
  const resetQuery = useCallback(() => setQuery(""), []);
  const {
    closePanel: close,
    listboxId,
    lockedWidth,
    mounted,
    open,
    openPanel: openPicker,
    panelPosition,
    panelRef,
    rootRef,
    searchRef,
  } = useInlinePickerState({ disabled, onClose: resetQuery });

  const activeOption = findInlineSearchPickerOption(options, value);

  const filteredOptions = useMemo(
    () => filterInlineSearchPickerOptions(options, query),
    [options, query],
  );

  const selectOption = useCallback(
    (option: InlineSearchPickerOption) => {
      if (option.disabled) {
        return;
      }

      if (option.action) {
        onSelectOption?.(option);
        close();
        return;
      }

      onChange(option.value);
      onSelectOption?.(option);
      close();
    },
    [close, onChange, onSelectOption],
  );

  useEffect(() => {
    if (!openOnMount || disabled) {
      return;
    }

    openPicker();
  }, [disabled, openOnMount, openPicker]);

  const shellClass = shellClassName
    ? shellClassName
    : compact
      ? `${shellBaseClass} ${minWidthClass}`
      : `${shellBaseClass} h-11 w-full min-w-[12rem] max-w-xs px-3`;

  const panelWidth = useMemo(() => {
    if (!panelPosition) {
      return PANEL_MIN_WIDTH;
    }

    return resolveInlineSearchPanelWidth(
      panelPosition.width,
      filteredOptions.map((option) => option.label),
    );
  }, [filteredOptions, panelPosition]);

  const panel =
    open && panelPosition && mounted ? (
      <InlineOptionsPanel
        emptyLabel={emptyLabel}
        listboxId={listboxId}
        options={filteredOptions}
        panelPosition={panelPosition}
        panelRef={panelRef}
        panelWidth={panelWidth}
        selectedValue={value}
        onSelectOption={selectOption}
      />
    ) : null;

  const triggerLabel = formatSelectedLabel
    ? formatSelectedLabel(activeOption, placeholder)
    : activeOption?.label || placeholder;

  const triggerIcon = leadingIcon ?? activeOption?.icon;

  return (
    <div className={`relative min-w-0 ${className || "shrink-0"}`}>
      <div
        ref={rootRef}
        className={`${shellClass} ${shellStateClass(open, disabled)}`}
        style={lockedWidth ? { width: lockedWidth } : undefined}
      >
        {triggerIcon ? (
          <span className="shrink-0 text-emerald-400">{triggerIcon}</span>
        ) : null}
        {open ? (
          <input
            ref={searchRef}
            type="text"
            className={`${fieldClass} text-[#f8fafc] placeholder:font-bold placeholder:text-slate-500`}
            placeholder={searchPlaceholder}
            value={query}
            aria-label={ariaLabel}
            disabled={disabled}
            aria-controls={listboxId}
            aria-expanded
            aria-autocomplete="list"
            role="combobox"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                const nextOption = filteredOptions.find((option) => !option.disabled);

                if (nextOption) {
                  event.preventDefault();
                  selectOption(nextOption);
                }
              }
            }}
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            className={`${fieldClass} min-w-0 truncate text-left capitalize text-[#f8fafc] disabled:cursor-not-allowed`}
            aria-haspopup="listbox"
            aria-expanded={false}
            aria-label={ariaLabel}
            onClick={openPicker}
          >
            {triggerLabel}
          </button>
        )}
        {value.trim() && !open ? (
          <button
            type="button"
            disabled={disabled}
            className={`${trailingSlotClass} text-slate-500 hover:text-slate-300 disabled:cursor-not-allowed`}
            aria-label="Quitar filtro"
            onClick={(event) => {
              event.stopPropagation();
              onChange("");
            }}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            className={`${trailingSlotClass} text-slate-400 disabled:cursor-not-allowed`}
            aria-label={open ? "Cerrar" : "Abrir"}
            onClick={() => (open ? close() : openPicker())}
          >
            <ChevronDown
              className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        )}
      </div>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

export type InlineSearchComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: InlineSearchPickerOption[];
  placeholder?: string;
  emptyLabel?: string;
  compact?: boolean;
  leadingIcon?: ReactNode;
  className?: string;
  ariaLabel?: string;
  minWidthClass?: string;
  disabled?: boolean;
  /** Mantiene el input visible al perder foco (filtros en toolbar). */
  persistent?: boolean;
  shellClassName?: string;
  onSelectOption?: (option: InlineSearchPickerOption) => void;
};

export function InlineSearchCombobox({
  value,
  onChange,
  options,
  placeholder = "Buscar…",
  emptyLabel = "Sin coincidencias",
  compact = true,
  leadingIcon,
  className = "",
  ariaLabel,
  minWidthClass = "min-w-[11rem] sm:min-w-[14rem]",
  disabled = false,
  persistent = false,
  shellClassName,
  onSelectOption,
}: InlineSearchComboboxProps) {
  const {
    closePanel: close,
    listboxId,
    lockedWidth,
    mounted,
    open,
    openPanel: openCombobox,
    panelPosition,
    panelRef,
    rootRef,
    searchRef,
  } = useInlinePickerState({ disabled });

  const filteredOptions = useMemo(
    () => filterInlineSearchPickerOptions(options, value),
    [options, value],
  );

  const activeOption = useMemo(() => {
    const normalized = normalizeSearch(value);

    if (!normalized) {
      return undefined;
    }

    return (
      findInlineSearchPickerOption(options, value) ||
      options.find((option) => normalizeSearch(option.label) === normalized)
    );
  }, [options, value]);

  const selectOption = useCallback(
    (option: InlineSearchPickerOption) => {
      onChange(option.label);
      onSelectOption?.(option);
      close();
    },
    [close, onChange, onSelectOption],
  );

  const shellClass = shellClassName
    ? shellClassName
    : compact
      ? `${shellBaseClass} ${minWidthClass}`
      : `${shellBaseClass} h-11 w-full min-w-[12rem] max-w-xs px-3`;

  const isActive = persistent || open || value.trim().length > 0;
  const showInput = persistent || open || value.trim().length > 0;

  const panelWidth = useMemo(() => {
    if (!panelPosition) {
      return PANEL_MIN_WIDTH;
    }

    return resolveInlineSearchPanelWidth(
      panelPosition.width,
      filteredOptions.map((option) => option.label),
    );
  }, [filteredOptions, panelPosition]);

  const panel =
    open && panelPosition && mounted ? (
      <InlineOptionsPanel
        emptyLabel={emptyLabel}
        listboxId={listboxId}
        options={filteredOptions}
        panelPosition={panelPosition}
        panelRef={panelRef}
        panelWidth={panelWidth}
        selectedValue={value}
        onSelectOption={selectOption}
      />
    ) : null;

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        ref={rootRef}
        className={`${shellClass} ${
          shellClassName
            ? isActive && !disabled
              ? "ring-1 ring-inset ring-emerald-500/25"
              : ""
            : shellStateClass(isActive, disabled)
        }`}
        style={lockedWidth ? { width: lockedWidth } : undefined}
      >
        {activeOption?.icon ? (
          <span className="shrink-0">{activeOption.icon}</span>
        ) : leadingIcon ? (
          <span className="shrink-0 text-slate-500">{leadingIcon}</span>
        ) : null}
        {showInput ? (
          <input
            ref={searchRef}
            type="text"
            className={`${fieldClass} text-[#f8fafc] placeholder:font-bold placeholder:text-slate-500`}
            placeholder={placeholder}
            value={value}
            aria-label={ariaLabel}
            disabled={disabled}
            aria-controls={listboxId}
            aria-expanded={open}
            aria-autocomplete="list"
            role="combobox"
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => {
              if (!disabled) {
                openCombobox();
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && filteredOptions[0]) {
                event.preventDefault();
                selectOption(filteredOptions[0]);
              }
            }}
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            className={`${fieldClass} truncate text-left capitalize disabled:cursor-not-allowed ${
              value.trim() ? "text-[#f8fafc]" : "text-slate-500"
            }`}
            aria-haspopup="listbox"
            aria-expanded={false}
            aria-label={ariaLabel}
            onClick={openCombobox}
          >
            {value.trim() ? value : placeholder}
          </button>
        )}
        {value.trim() && !open ? (
          <button
            type="button"
            disabled={disabled}
            className={`${trailingSlotClass} text-slate-500 hover:text-slate-300 disabled:cursor-not-allowed`}
            aria-label="Limpiar búsqueda"
            onClick={() => onChange("")}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            className={`${trailingSlotClass} text-slate-400 disabled:cursor-not-allowed`}
            aria-label={open ? "Cerrar" : "Abrir"}
            onClick={() => (open ? close() : openCombobox())}
          >
            <ChevronDown
              className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        )}
      </div>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
