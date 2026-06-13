// src/app/admin/dashboard/sections/MenuSection.tsx
//
// ─── SEZIONE: MENU ────────────────────────────────────────────────────────────
//
// Gestisce:
//   - Categorie (aggiungi / elimina)
//   - Piatti (crea / modifica / elimina / toggle disponibilità)
//   - Ingredienti e varianti per piatto (expand row)
//   - Import menu da file JSON o CSV
//
// Formato JSON atteso:
// [
//   {
//     "categoria": "Primi",
//     "nome": "Spaghetti Carbonara",
//     "descrizione": "...",
//     "prezzo": 12.50,
//     "disponibile": true,
//     "keywords": ["pasta", "uova"]
//   }
// ]
//
// Formato CSV atteso (header obbligatorio):
// categoria,nome,descrizione,prezzo,disponibile
// Primi,Spaghetti Carbonara,"Con guanciale",12.50,true
// ──────────────────────────────────────────────────────────────────────────────

"use client";

import React, { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Plus, Trash2, Edit, Save, X,
  ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp,
  Tag, Layers, ListTree, Utensils,
  Upload, FileJson, FileText, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";
import type { RestaurantCtx, ThemeMode } from "../page";

// ─── Types ────────────────────────────────────────────────────────────────────

type MenuItem = {
  id:               string;
  name:             string;
  description:      string | null;
  price_cents:      number;
  category_id:      string;
  is_available:     boolean;
  image_url?:       string | null;
  search_keywords?: string[] | null;
};

type Category = {
  id:            string;
  name:          string;
  sort_order:    number;
  restaurant_id: string;
};

type MenuItemOption = {
  id:            string;
  item_id:       string;
  name:          string;
  type:          "single" | "multiple";
  is_required:   boolean;
  min_selection: number;
  max_selection: number;
};

type MenuItemOptionChoice = {
  id:                   string;
  option_id:            string;
  name:                 string;
  price_modifier_cents: number;
  is_default:           boolean;
};

// ─── Import types ─────────────────────────────────────────────────────────────

type ImportRow = {
  categoria:   string;
  nome:        string;
  descrizione: string;
  prezzo:      number;
  disponibile: boolean;
  keywords:    string[];
  image_url:   string;
};

type ImportResult = {
  total:      number;
  imported:   number;
  skipped:    number;
  errors:     string[];
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  ctx:   RestaurantCtx;
  theme: ThemeMode;
}

export function MenuSection({ ctx, theme }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ── Stato menu ───────────────────────────────────────────────────────────────
  const [menuItems,    setMenuItems]    = useState<MenuItem[]>([]);
  const [categories,   setCategories]  = useState<Category[]>([]);
  const [menuLoading,  setMenuLoading] = useState(false);
  const [menuSaving,   setMenuSaving]  = useState(false);
  const [isEditing,    setIsEditing]   = useState(false);
  const [currentItem,  setCurrentItem] = useState<Partial<MenuItem>>({
    name: "", description: "", price_cents: 0, category_id: "", is_available: true, search_keywords: [],
  });
  const [keywordInput, setKeywordInput] = useState("");
  const [newCatName,   setNewCatName]  = useState("");
  const [catFilter,    setCatFilter]   = useState<string>("all");

  // ── Stato opzioni / varianti ─────────────────────────────────────────────────
  const [expandedId,       setExpandedId]       = useState<string | null>(null);
  const [itemOptionsMap,   setItemOptionsMap]   = useState<Record<string, MenuItemOption[]>>({});
  const [optionChoicesMap, setOptionChoicesMap] = useState<Record<string, MenuItemOptionChoice[]>>({});
  const [optionsInputMap,  setOptionsInputMap]  = useState<Record<string, string>>({});
  const [choicesInputMap,  setChoicesInputMap]  = useState<Record<string, string>>({});
  const [optionsSaving,    setOptionsSaving]    = useState<Record<string, boolean>>({});
  const [choiceMetaEdit,   setChoiceMetaEdit]   = useState<Record<string, { priceCents: number; isDefault: boolean }>>({});
  const [choiceMetaSaving, setChoiceMetaSaving] = useState<Record<string, boolean>>({});
  const [choicesSaving,    setChoicesSaving]    = useState<Record<string, boolean>>({});
  const [optionsLoading,   setOptionsLoading]   = useState<Record<string, boolean>>({});

  // ── Stato import ──────────────────────────────────────────────────────────────
  const [showImport,    setShowImport]    = useState(false);
  const [importing,     setImporting]     = useState(false);
  const [importPreview, setImportPreview] = useState<ImportRow[] | null>(null);
  const [importResult,  setImportResult]  = useState<ImportResult | null>(null);
  const [importError,   setImportError]   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef      = useRef<HTMLDivElement>(null);

  // ── Token tema ───────────────────────────────────────────────────────────────
  const dark         = theme === "dark";
  const bg           = dark ? "bg-[#13131e]"    : "bg-white";
  const bgSoft       = dark ? "bg-white/5"      : "bg-gray-50";
  const bgDeep       = dark ? "bg-[#0f0f18]"    : "bg-gray-100";
  const border       = dark ? "border-white/10" : "border-gray-200";
  const borderSoft   = dark ? "border-white/5"  : "border-gray-100";
  const txt          = dark ? "text-white"      : "text-gray-900";
  const muted        = dark ? "text-gray-400"   : "text-gray-500";
  const hoverRow     = dark ? "hover:bg-white/5": "hover:bg-gray-50";
  const inputBg      = dark ? "bg-[#0f0f18] focus:bg-[#0d0d14]" : "bg-gray-50 focus:bg-white";
  const inputBorder  = dark ? "border-white/10" : "border-gray-300";

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMenuData();
  }, [ctx.restaurantId]);

  // ── Fetch menu ────────────────────────────────────────────────────────────────
  const fetchMenuData = async () => {
    const rid = ctx.restaurantId;
    if (!rid) return;
    setMenuLoading(true);
    try {
      const { data: cats } = await supabase
        .from("menu_categories").select("*").eq("restaurant_id", rid)
        .order("sort_order", { ascending: true });
      setCategories(cats || []);

      const catIds = (cats || []).map(c => c.id);
      if (catIds.length > 0) {
        const { data: itms, error: itmsError } = await supabase
          .from("menu_items")
          .select("id, name, description, price_cents, category_id, is_available, image_url, search_keywords")
          .in("category_id", catIds)
          .order("name", { ascending: true });

        if (itmsError) {
          console.error("Errore fetch menu_items:", JSON.stringify(itmsError));
          const { data: itmsNoKw } = await supabase
            .from("menu_items")
            .select("id, name, description, price_cents, category_id, is_available, image_url")
            .in("category_id", catIds)
            .order("name", { ascending: true });
          setMenuItems((itmsNoKw || []).map(i => ({ ...i, search_keywords: null })));
        } else {
          setMenuItems(itms || []);
        }
      } else {
        setMenuItems([]);
      }
    } catch (err: any) {
      console.error("Errore fetch menu:", err);
    } finally {
      setMenuLoading(false);
    }
  };

  // ── Salva piatto ─────────────────────────────────────────────────────────────
  const handleSaveMenuItem = async () => {
    if (!currentItem.name?.trim() || !currentItem.category_id) {
      alert("Nome e Categoria sono obbligatori!"); return;
    }
    setMenuSaving(true);
    try {
      const keywords = (currentItem.search_keywords || []).filter(k => k.trim() !== "");
      const itemData = {
        name:            currentItem.name.trim(),
        description:     currentItem.description?.trim() || null,
        price_cents:     currentItem.price_cents || 0,
        category_id:     currentItem.category_id,
        is_available:    !!currentItem.is_available,
        image_url:       currentItem.image_url || null,
        search_keywords: keywords.length > 0 ? keywords : null,
        restaurant_id:   ctx.restaurantId,   // ← FIX: necessario per la RLS policy DELETE
      };

      let error: any = null;
      if (currentItem.id) {
        const res = await supabase.from("menu_items").update(itemData).eq("id", currentItem.id);
        error = res.error;
      } else {
        const res = await supabase.from("menu_items").insert([itemData]);
        error = res.error;
      }

      if (error) { alert(`Errore salvataggio: ${error.message}`); return; }

      await fetchMenuData();
      setIsEditing(false);
      setCurrentItem({ name: "", description: "", price_cents: 0, category_id: "", is_available: true, search_keywords: [] });
      setKeywordInput("");
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setMenuSaving(false);
    }
  };

  // ── Elimina piatto ────────────────────────────────────────────────────────────
  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm("Eliminare questo piatto?")) return;

    // Sgancia prima il riferimento da order_items per evitare la FK constraint
    const { error: unlinkErr } = await supabase
      .from("order_items")
      .update({ menu_item_id: null })
      .eq("menu_item_id", id);
    if (unlinkErr) {
      alert(`Errore scollegamento ordini: ${unlinkErr.message}`);
      return;
    }

    const { error, count } = await supabase
      .from("menu_items")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("restaurant_id", ctx.restaurantId);   // ← FIX: garantisce che la RLS trovi il record
    if (error) {
      alert(`Errore eliminazione: ${error.message}`);
      return;
    }
    if (count === 0) {
      alert("Eliminazione non riuscita: il piatto non appartiene a questo ristorante o è già stato eliminato.");
      return;
    }
    await fetchMenuData();
  };

  // ── Aggiungi categoria ────────────────────────────────────────────────────────
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await supabase.from("menu_categories").insert([{
      name: newCatName.trim(),
      sort_order: categories.length + 1,
      restaurant_id: ctx.restaurantId,
    }]);
    setNewCatName("");
    await fetchMenuData();
  };

  // ── Elimina categoria ─────────────────────────────────────────────────────────
  const handleDeleteCategory = async (categoryId: string) => {
    const itemsInCat = menuItems.filter(i => i.category_id === categoryId);
    if (itemsInCat.length > 0) {
      if (!confirm(`⚠️ Ci sono ${itemsInCat.length} piatti in questa categoria.\n\nVerranno spostati in "Non associato". Procedere?`)) return;
      let unassigned = categories.find(c => c.name.toLowerCase() === "non associato");
      if (!unassigned) {
        const { data: newCat } = await supabase
          .from("menu_categories")
          .insert([{ name: "Non associato", sort_order: 9999, restaurant_id: ctx.restaurantId }])
          .select().single();
        unassigned = newCat!;
      }
      await supabase.from("menu_items")
        .update({ category_id: unassigned!.id })
        .in("id", itemsInCat.map(i => i.id));
    } else {
      if (!confirm("Eliminare questa categoria?")) return;
    }
    await supabase.from("menu_categories").delete().eq("id", categoryId);
    await fetchMenuData();
  };

  // ── Elimina tutto il menu ─────────────────────────────────────────────────────
  const handleDeleteAllMenu = async () => {
    const totalItems = menuItems.length;
    const totalCats  = categories.length;
    if (totalItems === 0 && totalCats === 0) {
      alert("Il menu è già vuoto."); return;
    }
    const conferma = prompt(
      `⚠️ ATTENZIONE: stai per eliminare TUTTO il menu!\n\n` +
      `• ${totalItems} piatti\n` +
      `• ${totalCats} categorie\n\n` +
      `Questa azione è IRREVERSIBILE.\n\nScrivi "ELIMINA" per confermare:`
    );
    if (conferma?.trim() !== "ELIMINA") {
      if (conferma !== null) alert("Operazione annullata: testo di conferma errato.");
      return;
    }

    setMenuLoading(true);
    try {
      // 1. Sgancia order_items → menu_item_id per evitare FK violations
      if (menuItems.length > 0) {
        const ids = menuItems.map(i => i.id);
        const { error: unlinkErr } = await supabase
          .from("order_items")
          .update({ menu_item_id: null })
          .in("menu_item_id", ids);
        if (unlinkErr) throw new Error(`Scollegamento ordini: ${unlinkErr.message}`);
      }

      // 2. Elimina tutti i piatti del ristorante
      const { error: itemsErr } = await supabase
        .from("menu_items")
        .delete()
        .eq("restaurant_id", ctx.restaurantId);
      if (itemsErr) throw new Error(`Eliminazione piatti: ${itemsErr.message}`);

      // 3. Elimina tutte le categorie del ristorante
      const { error: catsErr } = await supabase
        .from("menu_categories")
        .delete()
        .eq("restaurant_id", ctx.restaurantId);
      if (catsErr) throw new Error(`Eliminazione categorie: ${catsErr.message}`);

      await fetchMenuData();
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setMenuLoading(false);
    }
  };

  // ── IMPORT: parse file ────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportResult(null);
    setImportPreview(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        let rows: ImportRow[] = [];

        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          rows = arr.map((r: any) => ({
            categoria:   String(r.categoria || r.category || ""),
            nome:        String(r.nome || r.name || ""),
            descrizione: String(r.descrizione || r.description || ""),
            prezzo:      parseFloat(r.prezzo ?? r.price ?? 0),
            disponibile: r.disponibile !== undefined ? Boolean(r.disponibile) : r.available !== undefined ? Boolean(r.available) : true,
            keywords:    Array.isArray(r.keywords) ? r.keywords.map(String) : [],
            image_url:   String(r.image_url || r.immagine || ""),
          }));
        } else if (file.name.endsWith(".csv")) {
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          if (lines.length < 2) throw new Error("CSV vuoto o senza dati");
          const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
          rows = lines.slice(1).map(line => {
            // gestisce virgole dentro quote
            const cols: string[] = [];
            let cur = "", inQ = false;
            for (const ch of line) {
              if (ch === '"') { inQ = !inQ; }
              else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
              else { cur += ch; }
            }
            cols.push(cur.trim());
            const get = (k: string) => cols[headers.indexOf(k)] ?? "";
            return {
              categoria:   get("categoria") || get("category"),
              nome:        get("nome") || get("name"),
              descrizione: get("descrizione") || get("description"),
              prezzo:      parseFloat(get("prezzo") || get("price") || "0"),
              disponibile: (get("disponibile") || get("available") || "true").toLowerCase() !== "false",
              keywords:    (get("keywords") || "").split(";").map(k => k.trim()).filter(Boolean),
              image_url:   get("image_url") || get("immagine") || "",
            };
          });
        } else {
          throw new Error("Formato non supportato. Usa .json o .csv");
        }

        const valid = rows.filter(r => r.nome.trim() && r.categoria.trim());
        if (valid.length === 0) throw new Error("Nessun piatto valido trovato nel file (nome e categoria obbligatori)");
        setImportPreview(valid);
      } catch (err: any) {
        setImportError(err.message);
      }
    };
    reader.readAsText(file, "UTF-8");
    // reset input per permettere di ricaricare lo stesso file
    e.target.value = "";
  };

  // ── IMPORT: esegui salvataggio nel DB ─────────────────────────────────────────
  const handleConfirmImport = async () => {
    if (!importPreview || importing) return;
    setImporting(true);
    setImportError(null);

    const result: ImportResult = { total: importPreview.length, imported: 0, skipped: 0, errors: [] };

    try {
      // Mappa categoria nome → id (crea se non esiste)
      const catMap: Record<string, string> = {};
      for (const cat of categories) {
        catMap[cat.name.toLowerCase()] = cat.id;
      }

      let sortOrder = categories.length + 1;

      for (const row of importPreview) {
        try {
          const catKey = row.categoria.trim().toLowerCase();

          // Crea categoria se non esiste
          if (!catMap[catKey]) {
            const { data: newCat, error: catErr } = await supabase
              .from("menu_categories")
              .insert([{ name: row.categoria.trim(), sort_order: sortOrder++, restaurant_id: ctx.restaurantId }])
              .select("id")
              .single();
            if (catErr) throw new Error(`Categoria "${row.categoria}": ${catErr.message}`);
            catMap[catKey] = newCat!.id;
          }

          const priceCents = isNaN(row.prezzo) ? 0 : Math.round(row.prezzo * 100);
          const keywords   = row.keywords.filter(k => k.length > 0);

          const { error: itemErr } = await supabase.from("menu_items").insert([{
            name:            row.nome.trim(),
            description:     row.descrizione.trim() || null,
            price_cents:     priceCents,
            category_id:     catMap[catKey],
            is_available:    row.disponibile,
            search_keywords: keywords.length > 0 ? keywords : null,
            image_url:       row.image_url.trim() || null,
            restaurant_id:   ctx.restaurantId,   // ← FIX: necessario per la RLS policy DELETE
          }]);

          if (itemErr) throw new Error(`Piatto "${row.nome}": ${itemErr.message}`);
          result.imported++;
        } catch (err: any) {
          result.skipped++;
          result.errors.push(err.message);
        }
      }
    } catch (err: any) {
      setImportError(err.message);
    } finally {
      setImporting(false);
      setImportResult(result);
      setImportPreview(null);
      await fetchMenuData();
    }
  };

  const resetImport = () => {
    setShowImport(false);
    setImportPreview(null);
    setImportResult(null);
    setImportError(null);
  };

  // ── Fetch opzioni per piatto ──────────────────────────────────────────────────
  const fetchOptionsForItem = async (itemId: string) => {
    setOptionsLoading(prev => ({ ...prev, [itemId]: true }));
    try {
      const { data: options } = await supabase
        .from("menu_item_options").select("*").eq("item_id", itemId)
        .order("name", { ascending: true });
      setItemOptionsMap(prev => ({ ...prev, [itemId]: options || [] }));

      if (options && options.length > 0) {
        const optionIds = options.map(o => o.id);
        const { data: choices } = await supabase
          .from("menu_item_option_choices").select("*").in("option_id", optionIds)
          .order("name", { ascending: true });

        const grouped: Record<string, MenuItemOptionChoice[]> = {};
        optionIds.forEach(id => { grouped[id] = []; });
        (choices || []).forEach(c => {
          if (!grouped[c.option_id]) grouped[c.option_id] = [];
          grouped[c.option_id].push(c);
        });
        setOptionChoicesMap(prev => ({ ...prev, ...grouped }));
        setChoiceMetaEdit(prev => {
          const updated = { ...prev };
          (choices || []).forEach(c => {
            updated[c.id] = { priceCents: c.price_modifier_cents ?? 0, isDefault: c.is_default ?? false };
          });
          return updated;
        });
      }
    } catch (err: any) {
      console.error("Errore fetch options:", err);
    } finally {
      setOptionsLoading(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // ── Salva opzioni ─────────────────────────────────────────────────────────────
  const handleSaveOptions = async (itemId: string) => {
    const input = optionsInputMap[itemId] || "";
    if (!input.trim()) return;
    setOptionsSaving(prev => ({ ...prev, [itemId]: true }));
    try {
      const names = input.split(",").map(s => s.trim()).filter(Boolean);
      for (const name of names) {
        const { data: existing } = await supabase
          .from("menu_item_options").select("id").eq("item_id", itemId).ilike("name", name).maybeSingle();
        let optionId: string;
        if (existing) {
          optionId = existing.id;
        } else {
          const { data: newOpt } = await supabase
            .from("menu_item_options")
            .insert([{ name, item_id: itemId, type: "single", is_required: false }])
            .select("id").single();
          optionId = newOpt!.id;
        }
        const { data: existingMap } = await supabase
          .from("menu_item_option_map").select("id")
          .eq("menu_item_id", itemId).eq("option_id", optionId).maybeSingle();
        if (!existingMap) {
          await supabase.from("menu_item_option_map").insert([{ menu_item_id: itemId, option_id: optionId }]);
        }
      }
      setOptionsInputMap(prev => ({ ...prev, [itemId]: "" }));
      await fetchOptionsForItem(itemId);
    } catch (err: any) {
      alert(`Errore salvataggio ingredienti: ${err.message}`);
    } finally {
      setOptionsSaving(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // ── Salva varianti (choices) ──────────────────────────────────────────────────
  const handleSaveChoices = async (optionId: string, itemId: string) => {
    const input = choicesInputMap[optionId] || "";
    if (!input.trim()) return;
    setChoicesSaving(prev => ({ ...prev, [optionId]: true }));
    try {
      const names = input.split(",").map(s => s.trim()).filter(Boolean);
      const { data: existing } = await supabase
        .from("menu_item_option_choices").select("name").eq("option_id", optionId);
      const existingNames = new Set((existing || []).map(c => c.name.toLowerCase()));
      const toInsert = names.filter(n => !existingNames.has(n.toLowerCase()));
      if (toInsert.length > 0) {
        await supabase.from("menu_item_option_choices")
          .insert(toInsert.map(name => ({ option_id: optionId, name })));
      }
      setChoicesInputMap(prev => ({ ...prev, [optionId]: "" }));
      await fetchOptionsForItem(itemId);
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setChoicesSaving(prev => ({ ...prev, [optionId]: false }));
    }
  };

  // ── Salva prezzi e predefinita ────────────────────────────────────────────────
  const handleSaveOptionChoices = async (optionId: string, itemId: string) => {
    const choices = optionChoicesMap[optionId] || [];
    if (!choices.length) return;
    setChoiceMetaSaving(prev => ({ ...prev, [optionId]: true }));
    try {
      for (const ch of choices) {
        const meta = choiceMetaEdit[ch.id] ?? { priceCents: 0, isDefault: false };
        await supabase.from("menu_item_option_choices")
          .update({ price_modifier_cents: meta.priceCents, is_default: meta.isDefault })
          .eq("id", ch.id);
      }
      await fetchOptionsForItem(itemId);
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setChoiceMetaSaving(prev => ({ ...prev, [optionId]: false }));
    }
  };

  // ── Elimina opzione ───────────────────────────────────────────────────────────
  const handleDeleteOption = async (optionId: string, itemId: string) => {
    if (!confirm("Eliminare questo ingrediente e tutte le sue varianti?")) return;
    await supabase.from("menu_item_option_choices").delete().eq("option_id", optionId);
    await supabase.from("menu_item_option_map").delete().eq("option_id", optionId).eq("menu_item_id", itemId);
    await supabase.from("menu_item_options").delete().eq("id", optionId).eq("item_id", itemId);
    await fetchOptionsForItem(itemId);
  };

  // ── Elimina choice ────────────────────────────────────────────────────────────
  const handleDeleteChoice = async (choiceId: string, optionId: string, itemId: string) => {
    await supabase.from("menu_item_option_choices").delete().eq("id", choiceId);
    await fetchOptionsForItem(itemId);
  };

  // ── Toggle expand ─────────────────────────────────────────────────────────────
  const toggleExpandItem = async (itemId: string) => {
    if (expandedId === itemId) {
      setExpandedId(null);
    } else {
      setExpandedId(itemId);
      if (itemOptionsMap[itemId] === undefined) await fetchOptionsForItem(itemId);
    }
  };

  const filteredItems = catFilter === "all"
    ? menuItems
    : menuItems.filter(i => i.category_id === catFilter);

  // ── Render pannello opzioni (inline row) ──────────────────────────────────────
  const renderOptionsPanel = (item: MenuItem) => {
    const options  = itemOptionsMap[item.id] || [];
    const loading  = optionsLoading[item.id];
    const isSaving = optionsSaving[item.id];

    return (
      <tr key={`options-${item.id}`}>
        <td colSpan={5} className={`px-0 py-0 border-b ${border}`}>
          <div className={`${bgDeep} border-t ${borderSoft}`}>
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 bg-green-500/15 rounded-lg flex items-center justify-center">
                  <ListTree className="w-4 h-4 text-green-400" />
                </div>
                <h4 className={`text-sm font-semibold ${txt}`}>
                  Ingredienti &amp; Varianti — {item.name}
                </h4>
                <span className={`ml-auto text-xs ${muted}`}>
                  {options.length === 0 ? "Nessun ingrediente" : `${options.length} ingrediente${options.length !== 1 ? "i" : ""}`}
                </span>
              </div>

              {loading ? (
                <div className="py-6 text-center">
                  <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* LEFT: lista opzioni */}
                  <div className="space-y-3">
                    {options.length === 0 ? (
                      <div className={`rounded-xl border ${border} p-4 text-center`}>
                        <p className={`text-sm ${muted}`}>Nessun ingrediente ancora</p>
                        <p className={`text-xs ${muted} mt-1 opacity-60`}>Usa il pannello a destra per aggiungerne</p>
                      </div>
                    ) : (
                      options.map(opt => {
                        const choices      = optionChoicesMap[opt.id] || [];
                        const isSavingMeta = choiceMetaSaving[opt.id];
                        return (
                          <div key={opt.id} className={`rounded-xl border ${border} overflow-hidden`}>
                            <div className={`flex items-center gap-3 px-4 py-3 ${bgSoft}`}>
                              <div className={`w-2 h-2 rounded-full ${opt.is_required ? "bg-orange-400" : "bg-green-400"}`} />
                              <span className={`text-sm font-semibold ${txt} flex-1`}>{opt.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${opt.is_required ? "bg-orange-500/20 text-orange-400" : "bg-green-500/15 text-green-400"}`}>
                                {opt.is_required ? "Obbligatorio" : "Opzionale"}
                              </span>
                              <button onClick={() => handleDeleteOption(opt.id, item.id)}
                                className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/15 rounded-lg transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="px-4 py-3 space-y-2">
                              {choices.length === 0 ? (
                                <p className={`text-xs ${muted} italic`}>Nessuna variante</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {choices.map(ch => {
                                    const meta = choiceMetaEdit[ch.id] ?? { priceCents: ch.price_modifier_cents ?? 0, isDefault: ch.is_default ?? false };
                                    return (
                                      <div key={ch.id} className={`flex items-center gap-2 px-3 py-2 ${bgDeep} border ${border} rounded-lg`}>
                                        <span className={`text-xs font-medium ${txt} flex-1 min-w-0 truncate`}>{ch.name}</span>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <span className="text-xs text-green-400 font-mono">+€</span>
                                          <input type="number" min="0" step="0.10"
                                            value={(meta.priceCents / 100).toFixed(2)}
                                            onChange={e => {
                                              const cents = Math.round(parseFloat(e.target.value || "0") * 100);
                                              setChoiceMetaEdit(prev => ({ ...prev, [ch.id]: { ...meta, priceCents: isNaN(cents) ? 0 : cents } }));
                                            }}
                                            className={`w-16 px-1.5 py-1 text-xs text-center ${inputBg} border ${inputBorder} rounded-md focus:ring-1 focus:ring-green-500 outline-none ${txt} transition-all`}
                                          />
                                        </div>
                                        <button
                                          onClick={() => {
                                            const becomesDefault = !meta.isDefault;
                                            setChoiceMetaEdit(prev => {
                                              const updated = { ...prev };
                                              if (becomesDefault) {
                                                choices.forEach(c => {
                                                  updated[c.id] = { ...(updated[c.id] ?? { priceCents: 0, isDefault: false }), isDefault: c.id === ch.id };
                                                });
                                              } else {
                                                updated[ch.id] = { ...meta, isDefault: false };
                                              }
                                              return updated;
                                            });
                                          }}
                                          className={`shrink-0 px-2 py-1 text-xs rounded-md transition-all font-medium ${meta.isDefault ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : `${muted} border ${border} hover:border-yellow-500/30 hover:text-yellow-400`}`}>
                                          ★
                                        </button>
                                        <button onClick={() => handleDeleteChoice(ch.id, opt.id, item.id)}
                                          className="shrink-0 p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/15 rounded-md transition-all">
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                  {choices.length > 0 && (
                                    <button onClick={() => handleSaveOptionChoices(opt.id, item.id)}
                                      disabled={!!isSavingMeta}
                                      className="w-full mt-1 py-1.5 bg-green-600/90 hover:bg-green-500 disabled:opacity-40 text-white text-xs rounded-lg font-medium transition-all flex items-center justify-center gap-1.5">
                                      {isSavingMeta
                                        ? <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Salvataggio...</>
                                        : <><Save className="w-3 h-3" /> Salva prezzi e predefinita</>}
                                    </button>
                                  )}
                                </div>
                              )}
                              <div className="flex gap-2 mt-2">
                                <input type="text" value={choicesInputMap[opt.id] || ""}
                                  onChange={e => setChoicesInputMap(prev => ({ ...prev, [opt.id]: e.target.value }))}
                                  onKeyDown={e => e.key === "Enter" && handleSaveChoices(opt.id, item.id)}
                                  placeholder="Es. Sesamo, Classico, Integrale"
                                  className={`flex-1 min-w-0 px-3 py-1.5 text-xs ${inputBg} border ${inputBorder} rounded-lg focus:ring-2 focus:ring-green-500/40 focus:border-green-500 outline-none ${txt} placeholder-gray-500 transition-all`}
                                />
                                <button onClick={() => handleSaveChoices(opt.id, item.id)}
                                  disabled={!!choicesSaving[opt.id] || !choicesInputMap[opt.id]?.trim()}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-xs rounded-lg font-medium transition-all flex items-center gap-1 whitespace-nowrap">
                                  <Plus className="w-3 h-3" /> Aggiungi
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* RIGHT: aggiungi ingredienti + anteprima */}
                  <div className="space-y-4">
                    <div className={`rounded-xl border ${border} p-4 space-y-3`}>
                      <h5 className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Aggiungi Ingredienti</h5>
                      <textarea rows={3} value={optionsInputMap[item.id] || ""}
                        onChange={e => setOptionsInputMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                        placeholder={"Separati da virgola:\nPane, Carne, Salse, Contorni"}
                        className={`w-full px-3 py-2.5 text-sm ${inputBg} border ${inputBorder} rounded-lg focus:ring-2 focus:ring-green-500/40 focus:border-green-500 outline-none ${txt} placeholder-gray-500 resize-none transition-all`}
                      />
                      <button onClick={() => handleSaveOptions(item.id)}
                        disabled={isSaving || !optionsInputMap[item.id]?.trim()}
                        className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                        {isSaving
                          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvataggio...</>
                          : <><Save className="w-4 h-4" /> Salva Ingredienti</>}
                      </button>
                    </div>

                    {options.length > 0 && (
                      <div className={`rounded-xl border ${border} p-4`}>
                        <h5 className={`text-xs font-semibold uppercase tracking-wider ${muted} mb-3`}>Anteprima struttura</h5>
                        <div className={`font-mono text-sm space-y-1 ${txt}`}>
                          <div className="flex items-center gap-2">
                            <Utensils className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="font-semibold">{item.name}</span>
                          </div>
                          {options.map((opt, i) => {
                            const choices = optionChoicesMap[opt.id] || [];
                            const prefix  = i === options.length - 1 ? "└─" : "├─";
                            return (
                              <div key={opt.id} className="ml-4">
                                <div className={`flex items-center gap-1.5 ${muted}`}>
                                  <span className="text-green-500/60 select-none">{prefix}</span>
                                  <Tag className="w-3 h-3 text-green-400/70" />
                                  <span className="font-medium text-green-300">{opt.name}</span>
                                  {choices.length > 0 && (
                                    <span className={`text-xs ${muted} opacity-60`}>
                                      : {choices.map(c => {
                                        const extra = c.price_modifier_cents > 0 ? ` +€${(c.price_modifier_cents / 100).toFixed(2)}` : "";
                                        const def   = c.is_default ? " ★" : "";
                                        return c.name + extra + def;
                                      }).join(", ")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </td>
      </tr>
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────────────
  if (menuLoading && menuItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-6xl w-full mx-auto">

      {/* ── Header + pulsanti ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className={`text-2xl font-bold ${txt}`}>Gestione Menu</h2>
          <p className={`${muted} text-sm mt-0.5`}>Organizza piatti, categorie e ingredienti</p>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2">
            {/* Bottone Elimina tutto il menu */}
            {(menuItems.length > 0 || categories.length > 0) && (
              <button
                onClick={handleDeleteAllMenu}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all border ${
                  dark
                    ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40"
                    : "bg-red-50 border-red-200 text-red-500 hover:bg-red-100 hover:border-red-300"
                }`}
                title="Elimina tutto il menu">
                <Trash2 className="w-4 h-4" />
                Svuota Menu
              </button>
            )}
            {/* Bottone Import */}
            <button
              onClick={() => { setShowImport(v => !v); setImportPreview(null); setImportResult(null); setImportError(null); }}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all border ${
                showImport
                  ? dark ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "bg-blue-50 border-blue-300 text-blue-600"
                  : dark ? "bg-white/5 border-white/10 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20" : "bg-gray-50 border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200"
              }`}>
              <Upload className="w-4 h-4" />
              Importa Menu
            </button>
            {/* Bottone Nuovo Piatto */}
            <button onClick={() => setIsEditing(true)}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all shadow-md">
              <Plus className="w-4 h-4" /> Nuovo Piatto
            </button>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          PANNELLO IMPORT
          ════════════════════════════════════════════════════════════════════ */}
      {showImport && (
        <div className={`${bg} rounded-2xl border ${border} overflow-hidden shadow-lg`}>
          <div className={`px-6 py-4 border-b ${border} ${bgSoft} flex items-center justify-between`}>
            <h3 className={`text-lg font-semibold ${txt} flex items-center gap-2`}>
              <Upload className="w-5 h-5 text-blue-400" />
              Importa Menu da File
            </h3>
            <button onClick={resetImport} className={`p-1.5 rounded-lg ${muted} hover:text-red-400 transition-colors`}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Formati supportati */}
            <div className={`rounded-xl border ${border} p-4 space-y-3`}>
              <p className={`text-sm font-semibold ${txt}`}>Formati supportati</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* JSON */}
                <div className={`rounded-lg p-3 ${bgSoft} border ${border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileJson className="w-4 h-4 text-yellow-400" />
                    <span className={`text-sm font-semibold ${txt}`}>JSON</span>
                  </div>
                  <pre className={`text-xs ${muted} overflow-x-auto`}>{`[
  {
    "categoria": "Primi",
    "nome": "Carbonara",
    "descrizione": "Con guanciale e pecorino",
    "prezzo": 12.50,
    "disponibile": true,
    "keywords": ["pasta", "uova"],
    "image_url": "https://esempio.com/carbonara.jpg"
  }
]`}</pre>
                  <p className={`text-xs ${muted} mt-2 opacity-70`}><code>image_url</code> → URL pubblico dell'immagine (opzionale)</p>
                </div>
                {/* CSV */}
                <div className={`rounded-lg p-3 ${bgSoft} border ${border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-green-400" />
                    <span className={`text-sm font-semibold ${txt}`}>CSV</span>
                  </div>
                  <pre className={`text-xs ${muted} overflow-x-auto`}>{`categoria,nome,descrizione,prezzo,disponibile,keywords,image_url
Primi,Carbonara,"Con guanciale",12.50,true,"pasta;uova",https://esempio.com/carbonara.jpg
Secondi,Bistecca,,18.00,true,,`}</pre>
                  <p className={`text-xs ${muted} mt-2 opacity-70`}><code>keywords</code> separati da <code>;</code> · <code>image_url</code> URL pubblico (opzionale)</p>
                </div>
              </div>
            </div>

            {/* Upload area */}
            {!importPreview && !importResult && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed ${dark ? "border-white/15 hover:border-blue-500/40 hover:bg-blue-500/5" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"} p-8 text-center cursor-pointer transition-all`}>
                <Upload className={`w-10 h-10 mx-auto mb-3 ${muted} opacity-50`} />
                <p className={`font-semibold ${txt}`}>Clicca per selezionare il file</p>
                <p className={`text-sm ${muted} mt-1`}>.json oppure .csv</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}

            {/* Errore parsing */}
            {importError && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Errore nel file</p>
                  <p className="text-sm mt-0.5 opacity-80">{importError}</p>
                  <button onClick={() => { setImportError(null); fileInputRef.current?.click(); }}
                    className="mt-2 text-xs underline opacity-70 hover:opacity-100">Riprova con un altro file</button>
                </div>
              </div>
            )}

            {/* Anteprima */}
            {importPreview && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold ${txt}`}>
                    Anteprima — {importPreview.length} piatto{importPreview.length !== 1 ? "i" : ""} trovato{importPreview.length !== 1 ? "i" : ""}
                  </p>
                  <button onClick={() => { setImportPreview(null); fileInputRef.current?.click(); }}
                    className={`text-xs ${muted} hover:text-blue-400 transition-colors`}>
                    Cambia file
                  </button>
                </div>
                <div className={`rounded-xl border ${border} overflow-hidden max-h-64 overflow-y-auto`}>
                  <table className="w-full text-sm">
                    <thead className={bgSoft}>
                      <tr>
                        {["Categoria", "Nome", "Prezzo", "Stato"].map(h => (
                          <th key={h} className={`px-4 py-2.5 text-left text-xs font-semibold ${muted} uppercase tracking-wider`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${border}`}>
                      {importPreview.map((row, i) => (
                        <tr key={i} className={hoverRow}>
                          <td className={`px-4 py-2.5 text-xs ${muted}`}>{row.categoria}</td>
                          <td className={`px-4 py-2.5 text-xs font-medium ${txt}`}>{row.nome}</td>
                          <td className="px-4 py-2.5 text-xs text-green-400 font-mono">€{row.prezzo.toFixed(2)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${row.disponibile ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-gray-400"}`}>
                              {row.disponibile ? "Attivo" : "Nascosto"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmImport}
                    disabled={importing}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all">
                    {importing
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Importazione in corso...</>
                      : <><Upload className="w-4 h-4" /> Conferma e Importa</>}
                  </button>
                  <button onClick={() => setImportPreview(null)}
                    className={`px-5 py-2.5 ${bgSoft} border ${border} ${muted} hover:text-red-400 rounded-xl font-medium transition-all`}>
                    Annulla
                  </button>
                </div>
              </div>
            )}

            {/* Risultato import */}
            {importResult && (
              <div className="space-y-3">
                <div className={`flex items-start gap-3 p-4 rounded-xl ${importResult.errors.length === 0 ? "bg-green-500/10 border border-green-500/30" : "bg-yellow-500/10 border border-yellow-500/30"}`}>
                  <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${importResult.errors.length === 0 ? "text-green-400" : "text-yellow-400"}`} />
                  <div>
                    <p className={`font-semibold text-sm ${importResult.errors.length === 0 ? "text-green-400" : "text-yellow-400"}`}>
                      Import completato
                    </p>
                    <p className={`text-sm mt-0.5 ${muted}`}>
                      {importResult.imported} piatti importati su {importResult.total}
                      {importResult.skipped > 0 && `, ${importResult.skipped} saltati`}
                    </p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className={`rounded-xl border ${border} p-3 space-y-1 max-h-32 overflow-y-auto`}>
                    <p className={`text-xs font-semibold ${muted} uppercase`}>Errori</p>
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-400 opacity-80">{e}</p>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => { setImportResult(null); fileInputRef.current?.click(); }}
                  className={`w-full py-2 ${bgSoft} border ${border} ${muted} hover:text-blue-400 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2`}>
                  <Upload className="w-4 h-4" /> Importa un altro file
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          FORM CREA / MODIFICA PIATTO
          ════════════════════════════════════════════════════════════════════ */}
      {isEditing && (
        <div ref={formRef} className={`${bg} rounded-2xl border ${border} overflow-hidden shadow-lg`}>
          <div className={`px-6 py-4 border-b ${border} ${bgSoft}`}>
            <h3 className={`text-lg font-semibold ${txt} flex items-center gap-2`}>
              {currentItem.id ? <Edit className="w-5 h-5 text-green-500" /> : <Plus className="w-5 h-5 text-green-500" />}
              {currentItem.id ? "Modifica Piatto" : "Aggiungi Nuovo Piatto"}
            </h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${muted}`}>Nome Piatto *</label>
                <input type="text"
                  className={`w-full px-4 py-2.5 ${inputBg} border ${inputBorder} rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${txt} placeholder-gray-500 transition-all`}
                  value={currentItem.name || ""}
                  onChange={e => setCurrentItem({ ...currentItem, name: e.target.value })}
                  placeholder="Es. Spaghetti alla Carbonara" />
              </div>
              <div className="space-y-2">
                <label className={`text-sm font-medium ${muted}`}>Categoria *</label>
                <select className={`w-full px-4 py-2.5 ${inputBg} border ${inputBorder} rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${txt} transition-all`}
                  value={currentItem.category_id || ""}
                  onChange={e => setCurrentItem({ ...currentItem, category_id: e.target.value })}>
                  <option value="">Seleziona categoria</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className={`text-sm font-medium ${muted}`}>Descrizione</label>
              <textarea rows={3}
                className={`w-full px-4 py-2.5 ${inputBg} border ${inputBorder} rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${txt} placeholder-gray-500 resize-none transition-all`}
                value={currentItem.description || ""}
                onChange={e => setCurrentItem({ ...currentItem, description: e.target.value })}
                placeholder="Ingredienti, allergeni, note..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${muted}`}>Prezzo (€)</label>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => setCurrentItem(p => ({ ...p, price_cents: Math.max(0, (p.price_cents || 0) - 50) }))}
                    className={`w-10 h-10 flex items-center justify-center ${inputBg} border ${inputBorder} rounded-xl font-bold text-lg transition-all active:scale-95 ${txt}`}>
                    −
                  </button>
                  <input type="number" step="0.01" min="0"
                    className={`flex-1 px-4 py-2.5 ${inputBg} border ${inputBorder} rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${txt} text-center transition-all`}
                    value={currentItem.price_cents ? (currentItem.price_cents / 100).toFixed(2) : "0.00"}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setCurrentItem({ ...currentItem, price_cents: !isNaN(val) ? Math.round(val * 100) : 0 });
                    }} />
                  <button type="button"
                    onClick={() => setCurrentItem(p => ({ ...p, price_cents: (p.price_cents || 0) + 50 }))}
                    className="w-10 h-10 flex items-center justify-center bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-lg transition-all active:scale-95">
                    +
                  </button>
                </div>
                <p className={`text-xs ${muted} text-center`}>Step ±€0,50 | input libero</p>
              </div>
              <div className="md:col-span-2 flex items-end">
                <button type="button"
                  onClick={() => setCurrentItem({ ...currentItem, is_available: !currentItem.is_available })}
                  className={`w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${currentItem.is_available ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30" : "bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30"}`}>
                  {currentItem.is_available ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  {currentItem.is_available ? "Disponibile" : "Non Disponibile"}
                </button>
              </div>
            </div>
            {/* ── Parole chiave ricerca ── */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${muted} flex items-center gap-1.5`}>
                <Tag className="w-3.5 h-3.5" /> Parole chiave ricerca
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === "Enter" || e.key === ",") && keywordInput.trim()) {
                      e.preventDefault();
                      const kw = keywordInput.trim().toLowerCase().replace(/,/g, "");
                      if (kw && !(currentItem.search_keywords || []).includes(kw)) {
                        setCurrentItem({ ...currentItem, search_keywords: [...(currentItem.search_keywords || []), kw] });
                      }
                      setKeywordInput("");
                    }
                    if (e.key === "Backspace" && !keywordInput && (currentItem.search_keywords || []).length > 0) {
                      const kws = [...(currentItem.search_keywords || [])];
                      kws.pop();
                      setCurrentItem({ ...currentItem, search_keywords: kws });
                    }
                  }}
                  className={`flex-1 px-4 py-2.5 ${inputBg} border ${inputBorder} rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${txt} placeholder-gray-500 transition-all`}
                  placeholder="Es. vegetariano, piccante, senza glutine — premi Invio o virgola per aggiungere"
                />
                {keywordInput.trim() && (
                  <button type="button"
                    onClick={() => {
                      const kw = keywordInput.trim().toLowerCase();
                      if (kw && !(currentItem.search_keywords || []).includes(kw)) {
                        setCurrentItem({ ...currentItem, search_keywords: [...(currentItem.search_keywords || []), kw] });
                      }
                      setKeywordInput("");
                    }}
                    className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-all">
                    + Aggiungi
                  </button>
                )}
              </div>
              {(currentItem.search_keywords || []).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {(currentItem.search_keywords || []).map(kw => (
                    <span key={kw} className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/25 text-green-400 rounded-full text-xs font-medium">
                      {kw}
                      <button type="button"
                        onClick={() => setCurrentItem({ ...currentItem, search_keywords: (currentItem.search_keywords || []).filter(k => k !== kw) })}
                        className="w-3.5 h-3.5 flex items-center justify-center hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className={`flex gap-3 pt-4 border-t ${border}`}>
              <button onClick={handleSaveMenuItem} disabled={menuSaving}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all shadow-md">
                {menuSaving
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvataggio...</>
                  : <><Save className="w-4 h-4" /> Salva</>}
              </button>
              <button onClick={() => { setIsEditing(false); setCurrentItem({}); setKeywordInput(""); }}
                className={`px-5 py-2.5 ${bgSoft} border ${border} ${muted} hover:text-red-400 rounded-xl flex items-center gap-2 font-medium transition-all`}>
                <X className="w-4 h-4" /> Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          CATEGORIE
          ════════════════════════════════════════════════════════════════════ */}
      <section className={`${bg} rounded-2xl border ${border} overflow-hidden shadow-sm`}>
        <div className={`px-6 py-4 border-b ${border} ${bgSoft}`}>
          <h3 className={`font-semibold ${txt} flex items-center gap-2`}>
            <span className="w-2 h-2 bg-green-500 rounded-full" /> Categorie
          </h3>
        </div>
        <div className="p-5 flex flex-wrap items-center gap-4">
          <input type="text" value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddCategory()}
            placeholder="Nuova categoria..."
            className={`flex-1 min-w-[200px] px-4 py-2 ${inputBg} border ${inputBorder} rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${txt} placeholder-gray-500 transition-all`}
          />
          <button onClick={handleAddCategory}
            className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-all">
            + Aggiungi
          </button>
          <div className="flex gap-2 flex-wrap ml-auto">
            {categories.length === 0
              ? <span className={`text-sm ${muted} italic`}>Nessuna categoria</span>
              : categories.map(cat => (
                <span key={cat.id} className="px-4 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full text-sm font-medium text-green-400 flex items-center gap-2 group hover:bg-green-500/20 transition-all">
                  {cat.name}
                  <button onClick={e => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                    className="w-5 h-5 flex items-center justify-center rounded-full text-green-400 hover:text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          TABELLA PIATTI
          ════════════════════════════════════════════════════════════════════ */}
      <section className={`${bg} rounded-2xl border ${border} overflow-hidden shadow-sm`}>
        <div className={`px-6 py-4 border-b ${border} ${bgSoft} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <h3 className={`font-semibold ${txt}`}>
              Piatti ({filteredItems.length})
            </h3>
            {filteredItems.length > 0 && (
              <span className={`text-sm ${muted}`}>
                {filteredItems.filter(i => i.is_available).length} disponibili
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className={`text-sm ${muted} font-medium`}>Filtra:</label>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className={`px-3 py-1.5 ${inputBg} ${inputBorder} border rounded-lg text-sm ${txt} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all cursor-pointer`}>
              <option value="all">Tutte le categorie</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className={`w-16 h-16 ${bgSoft} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
              <Utensils className={`w-8 h-8 ${muted}`} />
            </div>
            <p className={`${muted} font-medium`}>
              {catFilter === "all" ? "Nessun piatto nel menu" : "Nessun piatto in questa categoria"}
            </p>
            <p className={`text-sm ${muted} mt-1 opacity-70`}>
              {catFilter === "all" ? 'Clicca "Nuovo Piatto" per iniziare' : "Prova a cambiare filtro"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={bgSoft}>
                <tr>
                  {["Piatto", "Categoria", "Prezzo", "Stato", "Azioni"].map((h, i) => (
                    <th key={h} className={`px-6 py-4 text-xs font-semibold ${muted} uppercase tracking-wider ${i === 4 ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${border}`}>
                {filteredItems.map(item => {
                  const catName    = categories.find(c => c.id === item.category_id)?.name || "—";
                  const isExpanded = expandedId === item.id;
                  const optCount   = itemOptionsMap[item.id]?.length ?? null;
                  return (
                    <React.Fragment key={item.id}>
                      <tr className={`${hoverRow} transition-colors group ${isExpanded ? bgSoft : ""}`}>
                        <td className="px-6 py-4">
                          <div className={`font-semibold ${txt}`}>{item.name}</div>
                          {item.description && (
                            <div className={`text-sm ${muted} mt-0.5 line-clamp-1`}>{item.description}</div>
                          )}
                          {item.search_keywords && item.search_keywords.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {item.search_keywords.map(kw => (
                                <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/8 border border-green-500/20 text-green-400/70 rounded-full text-[10px] font-medium">
                                  <Tag className="w-2.5 h-2.5" />{kw}
                                </span>
                              ))}
                            </div>
                          )}
                          {optCount !== null && optCount > 0 && (
                            <div className="mt-1 flex items-center gap-1">
                              <Layers className="w-3 h-3 text-green-400/70" />
                              <span className="text-xs text-green-400/80">
                                {optCount} ingrediente{optCount !== 1 ? "i" : ""}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 ${bgSoft} ${muted} rounded-lg text-xs font-medium`}>
                            {catName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-green-400">
                            €{(item.price_cents / 100).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${item.is_available ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.is_available ? "bg-green-500" : "bg-gray-500"}`} />
                            {item.is_available ? "Attivo" : "Nascosto"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => toggleExpandItem(item.id)}
                              title="Gestisci ingredienti"
                              className={`p-2 rounded-lg transition-all flex items-center gap-1 text-xs font-medium ${isExpanded ? "bg-green-500/20 text-green-400 border border-green-500/20" : `${muted} hover:bg-green-500/10 hover:text-green-400 opacity-0 group-hover:opacity-100`}`}>
                              <ListTree className="w-4 h-4" />
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            <button onClick={() => {
                              setCurrentItem({ ...item, search_keywords: item.search_keywords || [] });
                              setKeywordInput("");
                              setIsEditing(true);
                              // Il form viene montato al prossimo render: aspettiamo 2 frame
                              requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                  if (formRef.current) {
                                    formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
                                  } else {
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                  }
                                });
                              });
                            }}
                              title="Modifica"
                              className={`p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100`}>
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteMenuItem(item.id)}
                              title="Elimina"
                              className={`p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && renderOptionsPanel(item)}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}