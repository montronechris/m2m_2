// src/app/admin/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { 
  LayoutDashboard, ShoppingCart, Utensils, Table, QrCode, 
  BarChart3, Users, Palette, Settings, Plus, Trash2, Edit, 
  Save, X, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight,
  Bell, Moon, Sun, Home
} from "lucide-react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Types
type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  category_id: string;
  is_available: boolean;
  image_url?: string | null;
};

type Category = {
  id: string;
  name: string;
  sort_order: number;
  restaurant_id: string;
};

type Order = {
  id: string;
  tableNumber: string;
  items: Array<{name: string; quantity: number; price: number}>;
  status: "pending" | "preparing" | "ready" | "delivered";
  notes?: string;
  timestamp: string;
  total: number;
};

type TableStatus = {
  id: string;
  number: string;
  status: "free" | "occupied" | "reserved";
  guests?: number;
};

export default function AdminDashboard() {
  // ===== STATE GENERALE =====
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState("Tavola Rapida");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  
  // ===== STATE PER ORDINI E TAVOLI (mock) =====
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<TableStatus[]>([]);
  
  // ===== STATE PER IL MENU =====
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuSaving, setMenuSaving] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [currentMenuItem, setCurrentMenuItem] = useState<Partial<MenuItem>>({
    name: "",
    description: "",
    price_cents: 0,
    category_id: "",
    is_available: true
  });
  const [newCatName, setNewCatName] = useState("");
  
  // 🆕 Stato per il filtro categorie
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Toggle Tema
  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");

  // ===== FETCH UTENTE E RISTORANTE =====
  useEffect(() => {
    const fetchUserAndRestaurant = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) { setIsLoading(false); return; }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('restaurant_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile?.restaurant_id) { setIsLoading(false); return; }

        setRestaurantId(profile.restaurant_id);
        
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("name, logo_url")
          .eq("id", profile.restaurant_id)
          .single();
        
        if (restaurant) {
          setRestaurantName(restaurant.name || "Tavola Rapida");
          setLogoUrl(restaurant.logo_url);
        }

        if (activeSection === "menu") await fetchMenuData(profile.restaurant_id);
        
        setOrders([{
          id: "ORD-2847", tableNumber: "TAV-03",
          items: [{name: "Spaghetti Carbonara", quantity: 2, price: 14}],
          status: "preparing", notes: "Senza cipolla", timestamp: "14:32", total: 28
        }]);
        setTables([
          {id: "1", number: "TAV-01", status: "occupied", guests: 2},
          {id: "2", number: "TAV-02", status: "free"},
        ]);
        
      } catch (err: any) {
        console.error("❌ Errore fetch dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserAndRestaurant();
  }, [supabase, activeSection]);

  // ===== FUNZIONI MENU =====
  const fetchMenuData = async (restId: string) => {
    if (!restId) return;
    try {
      setMenuLoading(true);
      const { data: cats, error: catErr } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restId)
        .order('sort_order', { ascending: true });
      
      if (catErr) throw catErr;
      setCategories(cats || []);

      const categoryIds = (cats || []).map(c => c.id);
      let itemsData: MenuItem[] = [];

      if (categoryIds.length > 0) {
        const { data: itms, error: itemErr } = await supabase
          .from('menu_items')
          .select('*')
          .in('category_id', categoryIds)
          .order('name', { ascending: true });
        if (itemErr) throw itemErr;
        itemsData = itms || [];
      }
      setMenuItems(itemsData);
    } catch (err: any) {
      console.error("❌ Errore fetch menu:", err);
      alert(`Errore caricamento menu: ${err.message}`);
    } finally {
      setMenuLoading(false);
    }
  };

  const handleSaveMenuItem = async () => {
    if (!currentMenuItem.name?.trim() || !currentMenuItem.category_id) {
      alert("Nome e Categoria sono obbligatori!");
      return;
    }
    if (!categories.find(c => c.id === currentMenuItem.category_id)) {
      alert("Categoria non valida.");
      return;
    }
    
    setMenuSaving(true);
    try {
      const itemData = {
        name: currentMenuItem.name.trim(),
        description: currentMenuItem.description?.trim() || null,
        price_cents: currentMenuItem.price_cents || 0,
        category_id: currentMenuItem.category_id,
        is_available: !!currentMenuItem.is_available,
        image_url: currentMenuItem.image_url || null
      };

      let error;
      if (currentMenuItem.id) {
        const { error: err } = await supabase.from('menu_items').update(itemData).eq('id', currentMenuItem.id);
        error = err;
      } else {
        const { error: err } = await supabase.from('menu_items').insert([itemData]);
        error = err;
      }
      if (error) throw error;
      
      if (restaurantId) await fetchMenuData(restaurantId);
      setIsEditingMenu(false);
      setCurrentMenuItem({ name: "", description: "", price_cents: 0, category_id: "", is_available: true });
    } catch (err: any) {
      console.error("❌ Errore salvataggio:", err);
      alert(`Errore: ${err.message || 'Controlla la console'}`);
    } finally {
      setMenuSaving(false);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm("Eliminare questo piatto?")) return;
    try {
      await supabase.from('menu_items').delete().eq('id', id);
      if (restaurantId) await fetchMenuData(restaurantId);
    } catch (err: any) {
      alert(`Errore eliminazione: ${err.message}`);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !restaurantId) return;
    try {
      await supabase.from('menu_categories').insert([{
        name: newCatName.trim(),
        sort_order: categories.length + 1,
        restaurant_id: restaurantId
      }]);
      setNewCatName("");
      if (restaurantId) await fetchMenuData(restaurantId);
    } catch (err: any) {
      alert(`Errore categoria: ${err.message}`);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const itemsInCat = menuItems.filter(i => i.category_id === categoryId);
    
    if (itemsInCat.length > 0) {
      if (!confirm(`⚠️ Ci sono ${itemsInCat.length} piatti in questa categoria.\n\nI piatti verranno spostati nella categoria "Non associato". Procedere?`)) return;
      
      try {
        // Cerca o crea la categoria "Non associato"
        let unassignedCategory = categories.find(c => c.name.toLowerCase() === "non associato");
        
        if (!unassignedCategory && restaurantId) {
          const { data: newCat, error: catError } = await supabase
            .from('menu_categories')
            .insert([{
              name: "Non associato",
              sort_order: 9999,
              restaurant_id: restaurantId
            }])
            .select()
            .single();
          
          if (catError) throw catError;
          unassignedCategory = newCat;
        }
        
        if (!unassignedCategory) throw new Error("Impossibile creare la categoria 'Non associato'");
        
        // Sposta i piatti
        const { error: updateError } = await supabase
          .from('menu_items')
          .update({ category_id: unassignedCategory.id })
          .in('id', itemsInCat.map(i => i.id));
        
        if (updateError) throw updateError;
        
        // Elimina la categoria originale
        const { error: deleteError } = await supabase
          .from('menu_categories')
          .delete()
          .eq('id', categoryId)
          .eq('restaurant_id', restaurantId);
        
        if (deleteError) throw deleteError;
        
        if (restaurantId) await fetchMenuData(restaurantId);
        
      } catch (err: any) {
        console.error("❌ Errore eliminazione categoria:", err);
        alert(`Errore: ${err.message}`);
      }
    } else {
      if (!confirm("Eliminare questa categoria?")) return;
      try {
        await supabase.from('menu_categories').delete().eq('id', categoryId).eq('restaurant_id', restaurantId);
        if (restaurantId) await fetchMenuData(restaurantId);
      } catch (err: any) {
        alert(`Errore: ${err.message}`);
      }
    }
  };

  // 🆕 Filtraggio piatti per categoria
  const filteredMenuItems = selectedCategoryFilter === "all"
    ? menuItems
    : menuItems.filter(item => item.category_id === selectedCategoryFilter);

  // ===== STILI DINAMICI PER TEMA =====
  const bg = theme === "light" ? "bg-white" : "bg-[#1a1a25]";
  const bgSoft = theme === "light" ? "bg-gray-50" : "bg-white/5";
  const border = theme === "light" ? "border-gray-200" : "border-white/10";
  const textPrimary = theme === "light" ? "text-gray-900" : "text-white";
  const textSecondary = theme === "light" ? "text-gray-500" : "text-gray-400";
  const inputBg = theme === "light" ? "bg-gray-50 focus:bg-white" : "bg-[#0f0f18]";
  const inputBorder = theme === "light" ? "border-gray-300" : "border-white/10";
  const hoverRow = theme === "light" ? "hover:bg-gray-50" : "hover:bg-white/5";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  // ===== RENDER SEZIONE MENU =====
  const renderMenuSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${textPrimary}`}>Gestione Menu</h2>
          <p className={`${textSecondary} text-sm`}>Organizza piatti e categorie</p>
        </div>
        {!isEditingMenu && (
          <button
            onClick={() => setIsEditingMenu(true)}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" /> Nuovo Piatto
          </button>
        )}
      </div>

      {isEditingMenu && (
        <div className={`${bg} rounded-2xl border ${border} overflow-hidden shadow-lg`}>
          <div className={`px-6 py-4 border-b ${border} ${bgSoft}`}>
            <h3 className={`text-lg font-semibold ${textPrimary} flex items-center gap-2`}>
              {currentMenuItem.id ? <Edit className="w-5 h-5 text-green-500"/> : <Plus className="w-5 h-5 text-green-500"/>}
              {currentMenuItem.id ? "Modifica Piatto" : "Aggiungi Nuovo Piatto"}
            </h3>
          </div>
          
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${textSecondary}`}>Nome Piatto *</label>
                <input type="text" className={`w-full px-4 py-2.5 ${inputBg} border ${inputBorder} rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${textPrimary} placeholder-gray-500 transition-all`} value={currentMenuItem.name || ""} onChange={(e) => setCurrentMenuItem({...currentMenuItem, name: e.target.value})} placeholder="Es. Spaghetti alla Carbonara" />
              </div>
              <div className="space-y-2">
                <label className={`text-sm font-medium ${textSecondary}`}>Categoria *</label>
                <select className={`w-full px-4 py-2.5 ${inputBg} border ${inputBorder} rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${textPrimary} transition-all`} value={currentMenuItem.category_id || ""} onChange={(e) => setCurrentMenuItem({...currentMenuItem, category_id: e.target.value})}>
                  <option value="">Seleziona categoria</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-medium ${textSecondary}`}>Descrizione</label>
              <textarea className={`w-full px-4 py-2.5 ${inputBg} border ${inputBorder} rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${textPrimary} placeholder-gray-500 resize-none transition-all`} rows={3} value={currentMenuItem.description || ""} onChange={(e) => setCurrentMenuItem({...currentMenuItem, description: e.target.value})} placeholder="Ingredienti, allergeni, note..." />
            </div>

            {/* PREZZO CON PULSANTI +/- €0,50 + INPUT LIBERO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${textSecondary}`}>Prezzo (€)</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setCurrentMenuItem(prev => ({ ...prev, price_cents: Math.max(0, (prev.price_cents || 0) - 50) }))} className={`w-10 h-10 flex items-center justify-center ${inputBg} border ${inputBorder} rounded-xl font-bold text-lg transition-all active:scale-95 ${textPrimary}`} title="Diminuisci di €0,50">−</button>
                  <input type="number" step="0.01" min="0" className={`flex-1 px-4 py-2.5 ${inputBg} border ${inputBorder} rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${textPrimary} text-center transition-all`} value={currentMenuItem.price_cents ? (currentMenuItem.price_cents / 100).toFixed(2) : "0.00"} onChange={(e) => { const val = parseFloat(e.target.value); setCurrentMenuItem({ ...currentMenuItem, price_cents: !isNaN(val) ? Math.round(val * 100) : 0 }); }} />
                  <button type="button" onClick={() => setCurrentMenuItem(prev => ({ ...prev, price_cents: (prev.price_cents || 0) + 50 }))} className="w-10 h-10 flex items-center justify-center bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-lg transition-all active:scale-95 shadow-md hover:shadow-lg" title="Aumenta di €0,50">+</button>
                </div>
                <p className={`text-xs ${textSecondary} text-center`}>Pulsanti: step €0,50 | Input: libero</p>
              </div>
              <div className="md:col-span-2 flex items-end">
                <button type="button" onClick={() => setCurrentMenuItem({...currentMenuItem, is_available: !currentMenuItem.is_available})} className={`w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${currentMenuItem.is_available ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30'}`}>
                  {currentMenuItem.is_available ? <ToggleRight className="w-5 h-5"/> : <ToggleLeft className="w-5 h-5"/>}
                  {currentMenuItem.is_available ? 'Disponibile' : 'Non Disponibile'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button onClick={handleSaveMenuItem} disabled={menuSaving} className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all shadow-md hover:shadow-lg">
                {menuSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />} 
                {menuSaving ? "Salvataggio..." : "Salva Modifiche"}
              </button>
              <button onClick={() => { setIsEditingMenu(false); setCurrentMenuItem({}); }} className={`px-5 py-2.5 ${bgSoft} hover:bg-white/10 ${textSecondary} rounded-xl flex items-center gap-2 font-medium transition-all`}>
                <X className="w-4 h-4"/> Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categorie */}
      <section className={`${bg} rounded-2xl border ${border} overflow-hidden shadow-lg`}>
        <div className={`px-6 py-4 border-b ${border} ${bgSoft}`}>
          <h3 className={`font-semibold ${textPrimary} flex items-center gap-2`}><span className="w-2 h-2 bg-green-500 rounded-full"/> Categorie</h3>
        </div>
        <div className="p-5 flex flex-wrap items-center gap-4">
          <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nuova categoria..." className={`flex-1 min-w-[200px] px-4 py-2 ${inputBg} border ${inputBorder} rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${textPrimary} placeholder-gray-500 transition-all`} onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} />
          <button onClick={handleAddCategory} className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg">+ Aggiungi</button>
          <div className="flex gap-2 flex-wrap ml-auto">
            {categories.length === 0 ? <span className={`text-sm ${textSecondary} italic`}>Nessuna categoria</span> : categories.map(cat => (
              <span key={cat.id} className="px-4 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full text-sm font-medium text-green-400 flex items-center gap-2 group hover:bg-green-500/20 transition-all">
                {cat.name}
                <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} className="w-5 h-5 flex items-center justify-center rounded-full text-green-400 hover:text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100" title="Elimina"><X className="w-3 h-3"/></button>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 🆕 Lista Piatti con FILTRO CATEGORIA */}
      <section className={`${bg} rounded-2xl border ${border} overflow-hidden shadow-lg`}>
        <div className={`px-6 py-4 border-b ${border} ${bgSoft} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <h3 className={`font-semibold ${textPrimary}`}>Piatti ({filteredMenuItems.length})</h3>
            {filteredMenuItems.length > 0 && <span className={`text-sm ${textSecondary}`}>{filteredMenuItems.filter(i => i.is_available).length} disponibili</span>}
          </div>
          
          {/* Dropdown Filtro Categorie */}
          <div className="flex items-center gap-2">
            <label className={`text-sm ${textSecondary} font-medium`}>Filtra:</label>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className={`px-3 py-1.5 ${inputBg} ${inputBorder} border rounded-lg text-sm ${textPrimary} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all cursor-pointer`}
            >
              <option value="all">Tutte le categorie</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {menuLoading ? (
          <div className="p-12 text-center"><div className="w-8 h-8 border-3 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto"/><p className="text-gray-400 mt-4">Caricamento piatti...</p></div>
        ) : filteredMenuItems.length === 0 ? (
          <div className="p-12 text-center"><div className={`w-16 h-16 ${bgSoft} rounded-2xl flex items-center justify-center mx-auto mb-4`}><Utensils className={`w-8 h-8 ${textSecondary}`}/></div><p className={`${textSecondary} font-medium`}>{selectedCategoryFilter === "all" ? "Nessun piatto nel menu" : "Nessun piatto in questa categoria"}</p><p className={`text-sm ${textSecondary} mt-1 opacity-70`}>{selectedCategoryFilter === "all" ? 'Clicca su "Nuovo Piatto" per iniziare' : 'Prova a cambiare filtro'}</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={bgSoft}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Piatto</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Categoria</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Prezzo</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Stato</th>
                  <th className={`px-6 py-4 text-right text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Azioni</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${border}`}>
                {filteredMenuItems.map(item => {
                  const catName = categories.find(c => c.id === item.category_id)?.name || "—";
                  return (
                    <tr key={item.id} className={`${hoverRow} transition-colors group`}>
                      <td className="px-6 py-4"><div className={`font-semibold ${textPrimary}`}>{item.name}</div>{item.description && <div className={`text-sm ${textSecondary} mt-0.5 line-clamp-1`}>{item.description}</div>}</td>
                      <td className="px-6 py-4"><span className={`inline-flex px-3 py-1 ${bgSoft} ${textSecondary} rounded-lg text-xs font-medium`}>{catName}</span></td>
                      <td className="px-6 py-4"><span className="font-semibold text-green-400">€{(item.price_cents / 100).toFixed(2)}</span></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${item.is_available ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${item.is_available ? 'bg-green-500' : 'bg-gray-500'}`} />{item.is_available ? 'Attivo' : 'Nascosto'}</span></td>
                      <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setCurrentMenuItem(item); setIsEditingMenu(true); }} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all" title="Modifica"><Edit className="w-4 h-4"/></button><button onClick={() => handleDeleteMenuItem(item.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all" title="Elimina"><Trash2 className="w-4 h-4"/></button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );

  // ===== RENDER ALTRE SEZIONI =====
  const renderDashboardSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        {label: "Ordini Oggi", value: "24", icon: ShoppingCart, color: "green"},
        {label: "Tavoli Occupati", value: "8/12", icon: Table, color: "blue"},
        {label: "Fatturato", value: "€1.240", icon: BarChart3, color: "purple"},
        {label: "Piatti Attivi", value: menuItems.filter(i => i.is_available).length, icon: Utensils, color: "orange"},
      ].map((stat, i) => (
        <div key={i} className={`${bg} rounded-2xl p-6 border ${border}`}>
          <div className="flex items-center justify-between">
            <div><p className={textSecondary}>{stat.label}</p><p className={`text-2xl font-bold ${textPrimary} mt-1`}>{stat.value}</p></div>
            <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/20 flex items-center justify-center`}><stat.icon className={`w-6 h-6 text-${stat.color}-400`}/></div>
          </div>
        </div>
      ))}
    </div>
  );

  // ===== LAYOUT PRINCIPALE =====
  return (
    <div className={`min-h-screen ${theme === "light" ? "bg-gray-50 text-gray-900" : "bg-[#0a0a0f] text-white"} flex`}>
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full ${theme === "light" ? "bg-white/90 border-gray-200" : "bg-[#111118]/95 border-white/5"} backdrop-blur-xl border-r z-40 transition-all duration-300 ${isSidebarCollapsed ? "w-20" : "w-72"}`}>
        <div className={`p-5 border-b ${theme === "light" ? "border-gray-200" : "border-white/5"} flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover"/> : <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center"><span className="text-white font-bold text-lg">TR</span></div>}
              <span className={`font-bold text-lg truncate max-w-[150px] ${textPrimary}`}>{restaurantName}</span>
            </div>
          )}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`p-2 ${theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/10"} rounded-lg transition-all`}>
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5"/> : <ChevronLeft className="w-5 h-5"/>}
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {[ 
            {id: "dashboard", label: "Dashboard", icon: LayoutDashboard}, 
            {id: "orders", label: "Ordini", icon: ShoppingCart}, 
            {id: "menu", label: "Menu", icon: Utensils}, 
            {id: "tables", label: "Tavoli", icon: Table}, 
            {id: "qr", label: "QR Code", icon: QrCode}, 
            {id: "analytics", label: "Analytics", icon: BarChart3}, 
            {id: "staff", label: "Staff", icon: Users}, 
            {id: "branding", label: "Branding", icon: Palette}, 
            {id: "settings", label: "Impostazioni", icon: Settings}
          ].map((item) => (
            <button key={item.id} onClick={() => { setActiveSection(item.id); if (item.id === "menu" && restaurantId && menuItems.length === 0) fetchMenuData(restaurantId); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeSection === item.id ? "bg-green-500/15 text-green-400 border border-green-500/20" : `${textSecondary} ${theme === "light" ? "hover:bg-gray-100 hover:text-gray-900" : "hover:text-white hover:bg-white/5"}`} ${isSidebarCollapsed ? "justify-center" : ""}`}>
              <item.icon className={`w-5 h-5 ${activeSection === item.id ? "text-green-400" : "group-hover:text-inherit transition-colors"}`}/>
              {!isSidebarCollapsed && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? "ml-20" : "ml-72"}`}>
        {/* Header/Navbar */}
        <header className={`sticky top-0 z-30 ${theme === "light" ? "bg-white/80 border-gray-200" : "bg-[#0a0a0f]/80 border-white/5"} backdrop-blur-xl border-b px-6 py-3 flex items-center justify-between`}>
          <h1 className={`text-xl font-bold capitalize ${textPrimary}`}>{activeSection}</h1>
          <div className="flex items-center gap-3">
            {/* Toggle Tema - Icone semplici bianco/nero */}
            <button onClick={toggleTheme} className={`p-2 ${theme === "light" ? "hover:bg-gray-100 text-gray-700" : "hover:bg-white/10 text-white"} rounded-xl transition-all`} title="Cambia tema">
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            {/* Notifiche - Icona semplice bianco/nero */}
            <button className={`p-2 ${theme === "light" ? "hover:bg-gray-100 text-gray-700" : "hover:bg-white/10 text-white"} rounded-xl transition-all relative`} title="Notifiche">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            {/* Avatar */}
            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center text-white font-bold text-sm">A</div>
          </div>
        </header>

        <div className="p-6">
          {activeSection === "dashboard" && renderDashboardSection()}
          {activeSection === "menu" && renderMenuSection()}
          {activeSection === "orders" && <div className="text-center py-20"><ShoppingCart className={`w-16 h-16 ${textSecondary} mx-auto mb-4`}/><p className={textSecondary}>Sezione Ordini - In sviluppo</p></div>}
          {activeSection === "tables" && <div className="text-center py-20"><Home className={`w-16 h-16 ${textSecondary} mx-auto mb-4`}/><p className={textSecondary}>Sezione Tavoli - In sviluppo</p></div>}
          {["qr", "analytics", "staff", "branding", "settings"].includes(activeSection) && <div className="text-center py-20"><Settings className={`w-16 h-16 ${textSecondary} mx-auto mb-4`}/><p className={textSecondary}>Sezione "{activeSection}" - In sviluppo</p></div>}
        </div>
      </main>
    </div>
  );
}