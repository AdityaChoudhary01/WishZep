
"use client";

import { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Settings, 
  Camera, 
  Loader2, 
  AlertCircle,
  Edit2,
  Trash2,
  ImagePlus,
  ShoppingBag,
  Truck,
  Clock,
  CheckCircle2,
  Menu,
  Tags,
  X,
  Save,
  Layers,
  ListPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, setDoc, updateDoc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('products');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirmedAdmin, setIsConfirmedAdmin] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  
  // Product Form State
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    description: '',
    price: '',
    discountPrice: '',
    inventory: '',
    category: '',
    imageUrl: '',
    images: [] as string[],
    sizes: '',
    sizeChartUrl: '',
    specifications: [] as { key: string; value: string }[]
  });

  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const secondaryFileInputRef = useRef<HTMLInputElement>(null);
  const chartFileInputRef = useRef<HTMLInputElement>(null);

  // Helper to determine if current category is apparel
  const isApparelCategory = useMemo(() => {
    if (!productFormData.category) return false;
    const cat = productFormData.category.toLowerCase();
    const apparelKeywords = ['apparel', 'clothing', 'clothes', 'shirt', 'pant', 't-shirt', 'hoodie', 'bottoms', 'top', 'trousers', 'wear'];
    return apparelKeywords.some(keyword => cat.includes(keyword));
  }, [productFormData.category]);

  // Fetch admin role status
  const adminRoleRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'roles_admin', user.uid);
  }, [db, user]);

  const { data: adminRole, isLoading: adminLoading } = useDoc(adminRoleRef);
  const isUserAdmin = !!adminRole && !adminLoading;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isUserAdmin) {
      // Small delay to ensure Firestore rules sync up before fetching restricted data
      timer = setTimeout(() => {
        setIsConfirmedAdmin(true);
      }, 1500);
    } else {
      setIsConfirmedAdmin(false);
    }
    return () => clearTimeout(timer);
  }, [isUserAdmin]);

  // Data Queries
  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db]);
  const { data: categories, isLoading: categoriesLoading } = useCollection(categoriesQuery);

  const ordersQuery = useMemoFirebase(() => {
    // Only query if confirmed admin to avoid permission errors
    if (!db || !isConfirmedAdmin || activeTab !== 'orders') return null;
    return query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
  }, [db, isConfirmedAdmin, activeTab]);
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useCollection(ordersQuery, true);

  const handleAddCategory = async () => {
    if (!db || !newCategory.trim()) return;
    const catId = newCategory.toLowerCase().replace(/\s+/g, '-');
    await setDoc(doc(db, 'categories', catId), {
      id: catId,
      name: newCategory.trim(),
      createdAt: new Date().toISOString()
    });
    setNewCategory('');
    toast({ title: "Category Added!" });
  };

  const handleUpdateOrderStatus = async (order: any, newStatus: string) => {
    if (!db || !isUserAdmin) return;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Status Updated", description: `Order #${order.id.slice(0, 8)} is now ${newStatus}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  const handleOpenProductDialog = (product: any = null) => {
    if (product) {
      setEditingProduct(product);
      setProductFormData({
        name: product.name || '',
        description: product.description || '',
        price: (product.price || '').toString(),
        discountPrice: (product.discountPrice || '').toString(),
        inventory: (product.inventory || '0').toString(),
        category: product.category || '',
        imageUrl: product.imageUrl || '',
        images: product.images || [],
        sizes: (product.sizes || []).join(', '),
        sizeChartUrl: product.sizeChartUrl || '',
        specifications: product.specifications ? Object.entries(product.specifications).map(([key, value]) => ({ key, value: value as string })) : []
      });
    } else {
      setEditingProduct(null);
      setProductFormData({
        name: '',
        description: '',
        price: '',
        discountPrice: '',
        inventory: '',
        category: '',
        imageUrl: '',
        images: [],
        sizes: '',
        sizeChartUrl: '',
        specifications: []
      });
    }
    setIsProductDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'main' | 'secondary' | 'chart') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      if (target === 'main') {
        setProductFormData(prev => ({ ...prev, imageUrl: url }));
      } else if (target === 'secondary') {
        setProductFormData(prev => ({ ...prev, images: [...prev.images, url] }));
      } else if (target === 'chart') {
        setProductFormData(prev => ({ ...prev, sizeChartUrl: url }));
      }
      toast({ title: "Image Uploaded!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Upload Failed" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSpec = () => {
    setProductFormData(prev => ({
      ...prev,
      specifications: [...prev.specifications, { key: '', value: '' }]
    }));
  };

  const handleSpecChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...productFormData.specifications];
    updated[index][field] = val;
    setProductFormData(prev => ({ ...prev, specifications: updated }));
  };

  const handleRemoveSpec = (index: number) => {
    setProductFormData(prev => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProduct = async () => {
    if (!db || !isUserAdmin) return;
    
    const specsObject: Record<string, string> = {};
    productFormData.specifications.forEach(s => {
      if (s.key.trim()) specsObject[s.key.trim()] = s.value;
    });

    const productData = {
      name: productFormData.name,
      description: productFormData.description,
      price: parseFloat(productFormData.price) || 0,
      discountPrice: productFormData.discountPrice ? parseFloat(productFormData.discountPrice) : 0,
      inventory: parseInt(productFormData.inventory) || 0,
      category: productFormData.category,
      imageUrl: productFormData.imageUrl,
      images: productFormData.images,
      sizes: isApparelCategory ? productFormData.sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
      sizeChartUrl: isApparelCategory ? productFormData.sizeChartUrl : '',
      specifications: specsObject,
      updatedAt: serverTimestamp(),
      createdAt: editingProduct ? editingProduct.createdAt : serverTimestamp()
    };

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        toast({ title: "Product Updated!" });
      } else {
        const newDocRef = doc(collection(db, 'products'));
        await setDoc(newDocRef, { ...productData, id: newDocRef.id });
        toast({ title: "Product Added!" });
      }
      setIsProductDialogOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed" });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!db || !isUserAdmin || !window.confirm("Delete this product?")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast({ title: "Product Deleted" });
    } catch (error) {
      toast({ variant: "destructive", title: "Delete Failed" });
    }
  };

  if (isUserLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const SidebarContent = () => (
    <nav className="space-y-4">
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 mb-2">Navigation</p>
        {[
          { id: 'products', label: 'Products', icon: Package },
          { id: 'categories', label: 'Categories', icon: Tags },
          { id: 'orders', label: 'Orders', icon: ShoppingBag },
        ].map((link) => (
          <button 
            key={link.id}
            onClick={() => {
              setActiveTab(link.id);
              setIsMobileMenuOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl h-12 px-4 transition-all text-sm font-bold",
              activeTab === link.id ? "bg-primary text-white shadow-lg" : "hover:bg-primary/5 text-gray-600"
            )}
          >
            <link.icon className="w-5 h-5" /> {link.label}
          </button>
        ))}
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-white flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 p-6 hidden md:block h-screen sticky top-0 z-30">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center rotate-12"><span className="text-white font-black text-2xl">W</span></div>
          <span className="text-xl font-bold wishzep-text tracking-tighter">ADMIN</span>
        </div>
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-100 p-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center rotate-6"><span className="text-white font-black text-lg">W</span></div>
          <span className="text-lg font-bold wishzep-text tracking-tighter">ADMIN</span>
        </div>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-xl"><Menu className="w-6 h-6" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-white w-72 p-6 border-none">
            <SheetHeader className="mb-8">
              <SheetTitle className="text-2xl font-black wishzep-text text-left">Admin Panel</SheetTitle>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </header>

      <main className="flex-1 p-4 md:p-8 space-y-8 overflow-x-hidden bg-background">
        {!isUserAdmin && !adminLoading && (
          <Alert variant="destructive" className="rounded-[2rem] border-destructive/20 bg-destructive/5">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>Your account does not have administrative privileges.</AlertDescription>
          </Alert>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6 animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-4xl font-black tracking-tight uppercase">Manage <span className="wishzep-text">Products</span></h1>
                <p className="text-muted-foreground text-sm font-medium">Add, edit, or remove items from your catalog.</p>
              </div>
              <Button onClick={() => handleOpenProductDialog()} className="rounded-2xl h-14 px-8 font-black gap-2 shadow-xl shadow-primary/20">
                <Plus className="w-6 h-6" /> ADD PRODUCT
              </Button>
            </header>

            <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
              <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader className="bg-gray-50/50">
                    <TableRow className="hover:bg-transparent border-gray-100">
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6">Product</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Category</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Stock</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Price</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px] tracking-widest px-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsLoading ? [...Array(4)].map((_, i) => (
                      <TableRow key={i}><TableCell className="px-6"><Skeleton className="h-10 w-40" /></TableCell><TableCell><Skeleton className="h-6 w-20" /></TableCell><TableCell><Skeleton className="h-6 w-16" /></TableCell><TableCell><Skeleton className="h-6 w-16" /></TableCell><TableCell className="text-right px-6"><Skeleton className="h-10 w-10 rounded-full ml-auto" /></TableCell></TableRow>
                    )) : products?.map((p) => (
                      <TableRow key={p.id} className="hover:bg-gray-50/50 transition-colors border-gray-50 h-20">
                        <TableCell className="font-bold px-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden relative border border-gray-100">
                              <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                            </div>
                            <div className="flex flex-col">
                              <span className="truncate max-w-[200px] text-sm font-black">{p.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold">{p.sizes?.length > 0 ? `${p.sizes.length} Sizes` : 'Standard'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="bg-white px-3 py-1 text-[9px] font-black uppercase tracking-wider">{p.category}</Badge></TableCell>
                        <TableCell className="font-bold text-muted-foreground text-xs">{p.inventory} UNITS</TableCell>
                        <TableCell className="font-black text-primary text-sm">Rs.{p.discountPrice || p.price}</TableCell>
                        <TableCell className="text-right px-6">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary" onClick={() => handleOpenProductDialog(p)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleDeleteProduct(p.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
              <DialogContent className="max-w-4xl rounded-[2rem] border-none max-h-[90vh] overflow-y-auto p-0 bg-white shadow-2xl">
                <div className="sticky top-0 z-50 bg-white border-b border-gray-100 p-8 flex justify-between items-center">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-black text-gray-900">
                      {editingProduct ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT'}
                    </DialogTitle>
                  </DialogHeader>
                  {/* Close button is automatically handled by DialogContent's X icon from shadcn */}
                </div>

                <div className="p-8 space-y-10">
                  <div className="grid lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Core Information</Label>
                        <Input 
                          placeholder="Product Name"
                          value={productFormData.name}
                          onChange={(e) => setProductFormData({...productFormData, name: e.target.value})}
                          className="h-14 rounded-2xl bg-gray-50 text-lg font-bold border-gray-200 focus:bg-white focus:border-primary transition-all text-gray-900" 
                        />
                        <Select 
                          value={productFormData.category} 
                          onValueChange={(val) => setProductFormData({...productFormData, category: val})}
                        >
                          <SelectTrigger className="h-14 rounded-2xl bg-gray-50 font-bold border-gray-200 text-gray-900">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            {categories?.map(cat => (
                              <SelectItem key={cat.id} value={cat.name} className="font-bold">{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Original Price</Label>
                          <Input 
                            type="number"
                            value={productFormData.price}
                            onChange={(e) => setProductFormData({...productFormData, price: e.target.value})}
                            className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-900 font-bold" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Discounted Price</Label>
                          <Input 
                            type="number"
                            value={productFormData.discountPrice}
                            onChange={(e) => setProductFormData({...productFormData, discountPrice: e.target.value})}
                            className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-900 font-bold" 
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Inventory Count</Label>
                        <Input 
                          type="number"
                          value={productFormData.inventory}
                          onChange={(e) => setProductFormData({...productFormData, inventory: e.target.value})}
                          className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-900 font-bold" 
                        />
                      </div>

                      {isApparelCategory && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Available Sizes (S, M, L...)</Label>
                          <Input 
                            placeholder="S, M, L, XL"
                            value={productFormData.sizes}
                            onChange={(e) => setProductFormData({...productFormData, sizes: e.target.value})}
                            className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-900 font-bold" 
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><Camera className="w-3 h-3" /> Main Visual</Label>
                        <div 
                          className="relative aspect-[4/3] rounded-3xl overflow-hidden group cursor-pointer border-2 border-dashed border-gray-200 hover:border-primary/50 transition-all bg-gray-50 hover:bg-gray-100" 
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {productFormData.imageUrl ? (
                            <Image src={productFormData.imageUrl} alt="Preview" fill className="object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                              {isUploading ? <Loader2 className="w-10 h-10 animate-spin text-primary" /> : <ImagePlus className="w-10 h-10 transition-transform group-hover:scale-110" />}
                              <span className="text-[10px] font-black uppercase tracking-widest">Upload Image</span>
                            </div>
                          )}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'main')} />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Gallery (Multiple)</Label>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                          {productFormData.images.map((img, idx) => (
                            <div key={idx} className="relative w-16 h-16 rounded-xl bg-gray-50 shrink-0 overflow-hidden border border-gray-200">
                              <Image src={img} alt={`Gallery ${idx}`} fill className="object-cover" />
                              <button 
                                onClick={() => setProductFormData(p => ({...p, images: p.images.filter((_, i) => i !== idx)}))}
                                className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive text-white rounded-full flex items-center justify-center shadow-lg"
                              ><X className="w-2.5 h-2.5" /></button>
                            </div>
                          ))}
                          <button 
                            onClick={() => secondaryFileInputRef.current?.click()}
                            className="w-16 h-16 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                          >
                            <Plus className="w-5 h-5 text-gray-400" />
                          </button>
                          <input type="file" ref={secondaryFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'secondary')} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-gray-100" />

                  <div className="grid lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Detailed Description</Label>
                        <Textarea 
                          value={productFormData.description}
                          placeholder="What makes this product special?"
                          onChange={(e) => setProductFormData({...productFormData, description: e.target.value})}
                          className="rounded-2xl bg-gray-50 min-h-[160px] p-6 leading-relaxed border-gray-200 focus:bg-white focus:border-primary transition-all text-gray-900" 
                        />
                      </div>
                      
                      {isApparelCategory && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Fit Blueprint (Size Chart)</Label>
                          <div 
                            className="h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-all gap-3 bg-gray-50"
                            onClick={() => chartFileInputRef.current?.click()}
                          >
                            {productFormData.sizeChartUrl ? (
                              <div className="flex items-center gap-3 text-green-500 font-bold">
                                <CheckCircle2 className="w-5 h-5" /> Blueprint Attached
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 text-gray-400">
                                <Layers className="w-5 h-5" /> Upload Size Chart
                              </div>
                            )}
                          </div>
                          <input type="file" ref={chartFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'chart')} />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Technical Specifications</Label>
                        <Button variant="ghost" size="sm" onClick={handleAddSpec} className="h-8 rounded-lg gap-2 font-bold text-[10px] hover:bg-primary/10">
                          <Plus className="w-3 h-3" /> ADD SPEC
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {productFormData.specifications.map((spec, idx) => (
                          <div key={idx} className="flex gap-2 items-center group">
                            <Input 
                              placeholder="Spec Label" 
                              value={spec.key} 
                              onChange={(e) => handleSpecChange(idx, 'key', e.target.value)}
                              className="h-10 rounded-xl bg-gray-50 text-xs font-bold border-gray-200 text-gray-900"
                            />
                            <Input 
                              placeholder="Spec Value" 
                              value={spec.value} 
                              onChange={(e) => handleSpecChange(idx, 'value', e.target.value)}
                              className="h-10 rounded-xl bg-gray-50 text-xs border-gray-200 text-gray-900"
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveSpec(idx)} className="text-destructive h-10 w-10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" onClick={() => setIsProductDialogOpen(false)} className="rounded-2xl h-16 px-10 font-bold flex-1 border-gray-200 hover:bg-gray-50">DISCARD</Button>
                    <Button onClick={handleSaveProduct} className="rounded-2xl h-16 px-20 font-black bg-primary flex-[2] gap-3 shadow-xl">
                      <Save className="w-6 h-6" /> {editingProduct ? 'UPDATE PRODUCT' : 'CREATE PRODUCT'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6 animate-fade-in">
            <header>
              <h1 className="text-4xl font-black tracking-tight uppercase">Product <span className="wishzep-text">Categories</span></h1>
              <p className="text-muted-foreground text-sm font-medium">Group your items for better catalog browsing.</p>
            </header>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-1">
                <div className="bg-white p-8 rounded-[2rem] space-y-6 border border-gray-100 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <ListPlus className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">New Category</h3>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Label Name</Label>
                    <Input 
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="e.g. Footwear" 
                      className="h-14 rounded-2xl bg-gray-50 font-bold border-gray-200 focus:bg-white transition-all text-gray-900"
                    />
                  </div>
                  <Button onClick={handleAddCategory} disabled={!newCategory} className="w-full rounded-2xl h-14 bg-primary font-black shadow-xl">ADD CATEGORY</Button>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow className="border-gray-100">
                        <TableHead className="font-black uppercase text-[10px] tracking-widest px-8">Name</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Slug ID</TableHead>
                        <TableHead className="text-right font-black uppercase text-[10px] tracking-widest px-8">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoriesLoading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell className="px-8"><Skeleton className="h-6 w-32" /></TableCell><TableCell><Skeleton className="h-6 w-32" /></TableCell><TableCell className="text-right px-8"><Skeleton className="h-8 w-8 ml-auto" /></TableCell></TableRow>) :
                      categories?.map((cat) => (
                        <TableRow key={cat.id} className="hover:bg-gray-50 transition-colors h-20 border-gray-100">
                          <TableCell className="px-8 font-black text-lg text-gray-900">{cat.name}</TableCell>
                          <TableCell className="text-[10px] font-mono font-bold text-gray-400">{cat.id}</TableCell>
                          <TableCell className="text-right px-8">
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => deleteDoc(doc(db!, 'categories', cat.id))}>
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fade-in">
            <header>
              <h1 className="text-4xl font-black tracking-tight uppercase">Customer <span className="wishzep-text">Orders</span></h1>
              <p className="text-muted-foreground text-sm font-medium">Fulfill and track global customer purchases.</p>
            </header>

            <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-gray-50">
                    <TableRow className="hover:bg-transparent border-gray-100">
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-8">Order #</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Placed On</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Total</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px] tracking-widest px-8">Control</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersLoading || !isConfirmedAdmin ? (
                      [...Array(5)].map((_, i) => <TableRow key={i}><TableCell className="px-8"><Skeleton className="h-6 w-32" /></TableCell><TableCell><Skeleton className="h-6 w-24" /></TableCell><TableCell><Skeleton className="h-6 w-20" /></TableCell><TableCell><Skeleton className="h-6 w-24" /></TableCell><TableCell className="text-right px-8"><Skeleton className="h-10 w-10 ml-auto rounded-full" /></TableCell></TableRow>)
                    ) : ordersError ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-20 text-center">
                          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                          <p className="font-bold text-lg">Connection Issue</p>
                          <p className="text-muted-foreground text-sm mb-6">Firestore rules are syncing. Please try again in a few seconds.</p>
                          <Button variant="outline" onClick={() => window.location.reload()}>Retry Connection</Button>
                        </TableCell>
                      </TableRow>
                    ) : orders?.map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50 transition-colors border-gray-100 h-24">
                        <TableCell className="px-8 font-black font-mono text-[11px] text-gray-900">{order.id.slice(0, 10)}</TableCell>
                        <TableCell className="text-xs font-bold text-gray-400">{new Date(order.orderDate).toLocaleString()}</TableCell>
                        <TableCell className="font-black text-primary text-sm">Rs.{order.totalAmount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "px-4 py-1.5 rounded-full text-[9px] uppercase font-black tracking-widest border-none",
                            order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                          )}>
                            {order.status || 'PENDING'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary"><Settings className="w-5 h-5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white min-w-[200px] rounded-[1.5rem] border-gray-100 p-2 shadow-xl">
                              <DropdownMenuItem onClick={() => handleUpdateOrderStatus(order, 'pending')} className="gap-3 cursor-pointer font-bold text-yellow-600 rounded-xl h-12 hover:bg-yellow-50"><Clock className="w-5 h-5" /> SET PENDING</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateOrderStatus(order, 'shipped')} className="gap-3 cursor-pointer font-bold text-blue-600 rounded-xl h-12 hover:bg-blue-50"><Truck className="w-5 h-5" /> SET SHIPPED</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateOrderStatus(order, 'delivered')} className="gap-3 cursor-pointer font-bold text-green-600 rounded-xl h-12 hover:bg-green-50"><CheckCircle2 className="w-5 h-5" /> SET DELIVERED</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!ordersLoading && isConfirmedAdmin && orders?.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="py-32 text-center bg-white border-none"><ShoppingBag className="w-16 h-16 mx-auto text-gray-200 mb-6" /><p className="font-black text-xl text-gray-400">No orders yet.</p></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
