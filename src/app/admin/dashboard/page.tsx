
"use client";

import { useState, useRef, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Settings, 
  BarChart3, 
  Users, 
  LayoutDashboard, 
  Database, 
  ShieldCheck, 
  X, 
  Camera, 
  Loader2, 
  AlertCircle,
  Edit2,
  Trash2,
  ImagePlus,
  Table as TableIcon,
  Check,
  Tags,
  ChevronRight,
  ChevronDown,
  ShoppingBag,
  History,
  Truck,
  Clock,
  CheckCircle2
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, addDoc, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, collectionGroup } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('products');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editMultiFileInputRef = useRef<HTMLInputElement>(null);
  const sizeChartRef = useRef<HTMLInputElement>(null);
  const editSizeChartRef = useRef<HTMLInputElement>(null);
  
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [newProduct, setNewProduct] = useState<any>({
    name: '',
    price: 0,
    discountPrice: 0,
    category: '',
    description: '',
    inventory: 10,
    imageUrl: '',
    images: [],
    attributes: '',
    sizes: [],
    sizeChartUrl: '',
    specifications: {}
  });

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const adminRoleRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'roles_admin', user.uid);
  }, [db, user]);

  const { data: adminRole, isLoading: adminLoading } = useDoc(adminRoleRef);
  
  // Important: Only consider the user an admin once the document has been successfully fetched.
  const isUserAdmin = !!adminRole && !adminLoading;

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

  // Fetch all orders across all users for the admin
  // We only enable this query once admin status is confirmed to avoid permission errors.
  const ordersQuery = useMemoFirebase(() => {
    if (!db || !isUserAdmin) return null;
    return query(collectionGroup(db, 'orders'), orderBy('orderDate', 'desc'));
  }, [db, isUserAdmin]);

  const { data: orders, isLoading: ordersLoading, error: ordersError } = useCollection(ordersQuery);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'images' | 'sizeChartUrl', isEdit = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(file => uploadToCloudinary(file)));
      
      const target = isEdit ? setEditingProduct : setNewProduct;
      
      target((prev: any) => {
        if (field === 'images') {
          return { ...prev, images: [...(prev.images || []), ...urls] };
        }
        return { ...prev, [field]: urls[0] };
      });

      toast({ title: "Upload Success! 📸" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const addSpecification = (isEdit = false) => {
    if (!newSpecKey || !newSpecValue) return;
    const target = isEdit ? setEditingProduct : setNewProduct;
    target((prev: any) => ({
      ...prev,
      specifications: { ...prev.specifications, [newSpecKey]: newSpecValue }
    }));
    setNewSpecKey('');
    setNewSpecValue('');
  };

  const removeSpecification = (key: string, isEdit = false) => {
    const target = isEdit ? setEditingProduct : setNewProduct;
    target((prev: any) => {
      const newSpecs = { ...prev.specifications };
      delete newSpecs[key];
      return { ...prev, specifications: newSpecs };
    });
  };

  const handleAddProduct = () => {
    if (!db || !isUserAdmin) return;
    if (!newProduct.imageUrl) {
      toast({ variant: "destructive", title: "Missing Image", description: "Please upload a primary image." });
      return;
    }
    if (!newProduct.category) {
      toast({ variant: "destructive", title: "Missing Category", description: "Please select a category." });
      return;
    }
    
    addDocumentNonBlocking(collection(db, 'products'), {
      ...newProduct,
      price: Number(newProduct.price),
      discountPrice: Number(newProduct.discountPrice) || 0,
      inventory: Number(newProduct.inventory),
      createdAt: serverTimestamp()
    });

    toast({ title: "Product Added! ✨", description: `${newProduct.name} is now live.` });
    setIsAddDialogOpen(false);
    setNewProduct({ name: '', price: 0, discountPrice: 0, category: '', description: '', inventory: 10, imageUrl: '', images: [], attributes: '', sizes: [], sizeChartUrl: '', specifications: {} });
  };

  const handleOpenEdit = (product: any) => {
    setEditingProduct({
      ...product,
      images: product.images || [],
      specifications: product.specifications || {},
      sizes: product.sizes || []
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!db || !isUserAdmin || !editingProduct) return;
    
    const { id, ...updateData } = editingProduct;
    updateDocumentNonBlocking(doc(db, 'products', id), {
      ...updateData,
      price: Number(editingProduct.price),
      discountPrice: Number(editingProduct.discountPrice) || 0,
      inventory: Number(editingProduct.inventory),
      updatedAt: serverTimestamp()
    });

    toast({ title: "Product Updated! 🛠️", description: `${editingProduct.name} changes are saved.` });
    setIsEditDialogOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    if (!db || !isUserAdmin) return;
    if (confirm("Are you sure you want to remove this product?")) {
      deleteDocumentNonBlocking(doc(db, 'products', productId));
      toast({ title: "Product Removed" });
    }
  };

  const handleAddCategory = () => {
    if (!db || !isUserAdmin || !newCategoryName.trim()) return;
    
    addDocumentNonBlocking(collection(db, 'categories'), {
      name: newCategoryName.trim(),
      createdAt: serverTimestamp()
    });

    toast({ title: "Category Created! 🏷️", description: `${newCategoryName} added to the vault.` });
    setNewCategoryName('');
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (!db || !isUserAdmin) return;
    if (confirm("Are you sure? Products in this category might need updating.")) {
      deleteDocumentNonBlocking(doc(db, 'categories', categoryId));
      toast({ title: "Category Removed" });
    }
  };

  const handleUpdateOrderStatus = (order: any, newStatus: string) => {
    if (!db || !isUserAdmin) return;
    
    const orderRef = doc(db, 'users', order.userId, 'orders', order.id);
    
    updateDocumentNonBlocking(orderRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    });

    toast({ title: "Status Updated", description: `Order #${order.id.slice(0, 8)} is now ${newStatus}.` });
  };

  const claimAdminRole = async () => {
    if (!db || !user) return;
    try {
      await setDoc(doc(db, 'roles_admin', user.uid), {
        uid: user.uid,
        email: user.email,
        assignedAt: serverTimestamp()
      });
      toast({ title: "Admin Access Granted! 🛡️" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Permission Denied" });
    }
  };

  if (isUserLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const renderProductForm = (product: any, setProduct: any, isEdit = false) => {
    const isApparel = product.category?.toLowerCase() === 'apparel' || product.category?.toLowerCase() === 'clothes' || product.category?.toLowerCase() === 'clothing';
    
    return (
      <div className="space-y-6 pt-4">
        {/* Images Section */}
        <div className="space-y-4">
          <Label className="font-bold text-xs uppercase tracking-widest">Visual Assets</Label>
          <div className="grid grid-cols-4 gap-4">
            <div 
              className="relative aspect-square glass rounded-2xl overflow-hidden border-2 border-dashed border-white/40 flex items-center justify-center group cursor-pointer" 
              onClick={() => (isEdit ? editFileInputRef : fileInputRef).current?.click()}
            >
              {product.imageUrl ? <Image src={product.imageUrl} alt="Main" fill className="object-cover" /> : <Camera className="w-8 h-8 text-muted-foreground" />}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-[10px] font-bold uppercase">Main Image</span>
              </div>
            </div>
            {product.images?.map((url: string, i: number) => (
              <div key={i} className="relative aspect-square glass rounded-2xl overflow-hidden group">
                <Image src={url} alt={`Gallery ${i}`} fill className="object-cover" />
                <button 
                  onClick={() => setProduct((p: any) => ({ ...p, images: p.images.filter((_: any, idx: number) => idx !== i) }))}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button 
              className="aspect-square glass rounded-2xl border-2 border-dashed border-white/40 flex items-center justify-center hover:bg-white/10 transition-colors"
              onClick={() => (isEdit ? editMultiFileInputRef : multiFileInputRef).current?.click()}
            >
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>
          <input type="file" ref={isEdit ? editFileInputRef : fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'imageUrl', isEdit)} />
          <input type="file" ref={isEdit ? editMultiFileInputRef : multiFileInputRef} className="hidden" multiple accept="image/*" onChange={(e) => handleImageUpload(e, 'images', isEdit)} />
        </div>

        {/* Basic Info */}
        <div className="grid gap-4">
          <div className="grid gap-2"><Label>Product Name</Label><Input value={product.name || ''} onChange={e => setProduct({...product, name: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between glass">
                    {product.category || 'Select Category'} <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass min-w-[200px]">
                  {categoriesLoading ? (
                    <div className="p-2 text-center text-xs">Loading categories...</div>
                  ) : categories?.length ? (
                    categories.map(cat => (
                      <DropdownMenuItem key={cat.id} onClick={() => setProduct({...product, category: cat.name})}>{cat.name}</DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-2 text-center text-xs">No categories found. Add one in the Categories tab.</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid gap-2"><Label>Inventory Stock</Label><Input type="number" value={product.inventory || 0} onChange={e => setProduct({...product, inventory: Number(e.target.value)})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Original Price (Rs.)</Label><Input type="number" value={product.price || 0} onChange={e => setProduct({...product, price: Number(e.target.value)})} /></div>
            <div className="grid gap-2"><Label>Discount Price (Rs.)</Label><Input type="number" value={product.discountPrice || 0} onChange={e => setProduct({...product, discountPrice: Number(e.target.value)})} /></div>
          </div>
        </div>

        {/* Apparel Specific Features */}
        {isApparel && (
          <div className="space-y-4 p-6 glass rounded-[2rem] border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary text-white">Apparel Features Unlocked</Badge>
              <h4 className="font-bold text-sm uppercase tracking-wider">Garment Config</h4>
            </div>
            
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Available Sizes</Label>
              <div className="flex flex-wrap gap-2">
                {SIZES.map(size => (
                  <div key={size} className="flex items-center gap-2 bg-white/30 px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/50 transition-colors">
                    <Checkbox 
                      id={`size-${size}-${isEdit ? 'edit' : 'new'}`}
                      checked={product.sizes?.includes(size)}
                      onCheckedChange={(checked) => {
                        const newSizes = checked 
                          ? [...(product.sizes || []), size]
                          : (product.sizes || []).filter((s: string) => s !== size);
                        setProduct({...product, sizes: newSizes});
                      }}
                    />
                    <Label htmlFor={`size-${size}-${isEdit ? 'edit' : 'new'}`} className="cursor-pointer font-bold">{size}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Size Chart Image</Label>
              <div 
                className="relative h-24 w-full glass rounded-xl border-2 border-dashed border-primary/20 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 transition-colors overflow-hidden"
                onClick={() => (isEdit ? editSizeChartRef : sizeChartRef).current?.click()}
              >
                {product.sizeChartUrl ? (
                  <>
                    <Image src={product.sizeChartUrl} alt="Size Chart" fill className="object-cover opacity-50" />
                    <div className="relative z-10 flex flex-col items-center">
                       <Check className="text-green-500 mb-1" />
                       <span className="text-[10px] font-black uppercase tracking-tighter">Update Size Chart</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <TableIcon className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Upload Size Chart</span>
                  </div>
                )}
                <input type="file" ref={isEdit ? editSizeChartRef : sizeChartRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'sizeChartUrl', isEdit)} />
              </div>
            </div>
          </div>
        )}

        {/* Specifications Section */}
        <div className="space-y-4">
          <Label className="font-bold text-xs uppercase tracking-widest">Technical Specifications</Label>
          <div className="grid gap-3">
            {Object.entries(product.specifications || {}).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3 bg-white/20 p-3 rounded-xl group">
                <div className="flex-1 flex gap-2">
                  <span className="font-bold text-xs uppercase text-primary w-24 shrink-0">{key}:</span>
                  <span className="text-xs text-muted-foreground">{value as string}</span>
                </div>
                <button onClick={() => removeSpecification(key, isEdit)} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Key (e.g. Fabric)" value={newSpecKey} onChange={e => setNewSpecKey(e.target.value)} className="h-10 text-xs" />
              <Input placeholder="Value (e.g. 100% Cotton)" value={newSpecValue} onChange={e => setNewSpecValue(e.target.value)} className="h-10 text-xs" />
              <Button size="icon" variant="secondary" onClick={() => addSpecification(isEdit)} className="shrink-0"><Plus /></Button>
            </div>
          </div>
        </div>

        <div className="grid gap-2"><Label>Description</Label><Textarea value={product.description || ''} onChange={e => setProduct({...product, description: e.target.value})} className="min-h-[120px]" /></div>
        <div className="grid gap-2"><Label>Aura Attributes</Label><Input value={product.attributes || ''} onChange={e => setProduct({...product, attributes: e.target.value})} placeholder="e.g. Slim Fit, Digital Mesh" /></div>

        <Button onClick={isEdit ? handleSaveEdit : handleAddProduct} disabled={isUploading} className="w-full h-14 rounded-2xl bg-primary text-lg font-black shadow-xl shadow-primary/20">
          {isEdit ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 glass border-r border-white/20 p-6 hidden md:block">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center rotate-12"><span className="text-white font-black text-2xl">W</span></div>
          <span className="text-xl font-bold wishzep-text">Admin</span>
        </div>
        <nav className="space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 mb-2">Management</p>
            <Button 
              variant={activeTab === 'products' ? 'default' : 'ghost'} 
              onClick={() => setActiveTab('products')}
              className={cn("w-full justify-start gap-3 rounded-xl h-12", activeTab === 'products' ? "shadow-lg shadow-primary/20" : "")}
            >
              <Package className="w-5 h-5" /> Inventory
            </Button>
            <Button 
              variant={activeTab === 'categories' ? 'default' : 'ghost'} 
              onClick={() => setActiveTab('categories')}
              className={cn("w-full justify-start gap-3 rounded-xl h-12", activeTab === 'categories' ? "shadow-lg shadow-primary/20" : "")}
            >
              <Tags className="w-5 h-5" /> Categories
            </Button>
            <Button 
              variant={activeTab === 'orders' ? 'default' : 'ghost'} 
              onClick={() => setActiveTab('orders')}
              className={cn("w-full justify-start gap-3 rounded-xl h-12", activeTab === 'orders' ? "shadow-lg shadow-primary/20" : "")}
            >
              <ShoppingBag className="w-5 h-5" /> Orders
            </Button>
          </div>

          <div className="pt-4 space-y-2">
            {!isUserAdmin && (
              <Button onClick={claimAdminRole} className="w-full justify-start gap-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white h-12">
                <ShieldCheck className="w-5 h-5" /> Claim Admin
              </Button>
            )}
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-8 space-y-8">
        {!isUserAdmin && !adminLoading && (
          <Alert variant="destructive" className="rounded-3xl">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>Claim admin status to manage products and categories.</AlertDescription>
          </Alert>
        )}

        {activeTab === 'products' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <header className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-black">Manage <span className="wishzep-text">Vault</span></h1>
                <p className="text-muted-foreground text-sm">Control your high-performance catalogue.</p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!isUserAdmin} className="rounded-2xl h-14 px-8 gap-2 bg-primary shadow-xl shadow-primary/20">
                    <Plus className="w-6 h-6" /> New Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass max-w-2xl overflow-y-auto max-h-[90vh] rounded-[2.5rem]">
                  <DialogHeader><DialogTitle className="text-2xl font-black">Add New Artifact</DialogTitle></DialogHeader>
                  {renderProductForm(newProduct, setNewProduct)}
                </DialogContent>
              </Dialog>
            </header>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="glass max-w-2xl overflow-y-auto max-h-[90vh] rounded-[2.5rem]">
                <DialogHeader><DialogTitle className="text-2xl font-black">Edit Product: {editingProduct?.name}</DialogTitle></DialogHeader>
                {editingProduct && renderProductForm(editingProduct, setEditingProduct, true)}
              </DialogContent>
            </Dialog>

            <div className="glass rounded-[2rem] overflow-hidden border border-white/20 shadow-2xl">
              <Table>
                <TableHeader className="bg-white/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6">Product</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Category</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Stock</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Price</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsLoading ? [...Array(3)].map((_, i) => (
                    <TableRow key={i}><TableCell className="px-6"><Skeleton className="h-10 w-40" /></TableCell><TableCell><Skeleton className="h-6 w-20" /></TableCell><TableCell><Skeleton className="h-6 w-16" /></TableCell><TableCell><Skeleton className="h-6 w-16" /></TableCell><TableCell className="text-right px-6"><Skeleton className="h-10 w-10 rounded-full ml-auto" /></TableCell></TableRow>
                  )) : products?.map((p) => (
                    <TableRow key={p.id} className="hover:bg-white/20 transition-colors border-white/10 h-20">
                      <TableCell className="font-bold px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden relative border border-white/20">
                            <Image src={p.imageUrl || `https://picsum.photos/seed/${p.id}/100/100`} alt={p.name} fill className="object-cover" />
                          </div>
                          <span className="truncate max-w-[200px]">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="glass px-3 py-1">{p.category}</Badge></TableCell>
                      <TableCell className="font-medium text-muted-foreground">{p.inventory} units</TableCell>
                      <TableCell className="font-black text-primary">Rs.{p.discountPrice || p.price}</TableCell>
                      <TableCell className="text-right px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/40"><MoreHorizontal /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass min-w-[140px] rounded-xl">
                            <DropdownMenuItem onClick={() => handleOpenEdit(p)} className="gap-2 cursor-pointer font-bold"><Edit2 className="w-4 h-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteProduct(p.id)} className="gap-2 cursor-pointer text-destructive focus:text-destructive font-bold"><Trash2 className="w-4 h-4" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-4xl mx-auto">
            <header className="space-y-2">
              <h1 className="text-4xl font-black">Tag <span className="wishzep-text">Mastery</span></h1>
              <p className="text-muted-foreground text-sm">Organize your drops with custom categories.</p>
            </header>

            <div className="glass p-8 rounded-[2rem] space-y-6">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label className="ml-1 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Category Name</Label>
                  <Input 
                    placeholder="e.g. Digital Footwear" 
                    value={newCategoryName} 
                    onChange={e => setNewCategoryName(e.target.value)} 
                    className="h-14 rounded-2xl glass border-white/20 text-lg"
                  />
                </div>
                <div className="pt-6">
                  <Button 
                    disabled={!isUserAdmin || !newCategoryName.trim()} 
                    onClick={handleAddCategory}
                    className="h-14 rounded-2xl px-10 bg-primary shadow-xl shadow-primary/20 font-black"
                  >
                    Add Category
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="ml-1 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Active Categories</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categoriesLoading ? (
                    [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)
                  ) : categories?.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between glass p-4 rounded-2xl group hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Tags className="w-5 h-5" />
                        </div>
                        <span className="font-bold">{cat.name}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={!isUserAdmin}
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {!categoriesLoading && categories?.length === 0 && (
                    <div className="col-span-full py-12 text-center glass rounded-2xl space-y-2">
                      <Tags className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
                      <p className="font-bold text-muted-foreground">No categories defined yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <header className="space-y-2">
              <h1 className="text-4xl font-black">Order <span className="wishzep-text">Command</span></h1>
              <p className="text-muted-foreground text-sm">Fulfill the vision. Manage customer drops.</p>
            </header>

            <div className="glass rounded-[2rem] overflow-hidden border border-white/20 shadow-2xl">
              <Table>
                <TableHeader className="bg-white/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6">Order ID</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Amount</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="px-6"><Skeleton className="h-6 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell className="text-right px-6"><Skeleton className="h-10 w-10 ml-auto rounded-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : orders?.map((order) => (
                    <TableRow key={order.id} className="hover:bg-white/10 transition-colors border-white/10 h-20">
                      <TableCell className="px-6 font-bold font-mono text-xs">
                        #{order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-black text-primary">
                        Rs.{order.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "px-3 py-1 rounded-full text-[10px] uppercase font-black",
                          order.status === 'delivered' ? 'bg-green-500/20 text-green-500 border-green-500/20' : 
                          order.status === 'shipped' ? 'bg-blue-500/20 text-blue-500 border-blue-500/20' : 
                          'bg-yellow-500/20 text-yellow-500 border-yellow-500/20'
                        )}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/20"><Settings className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass min-w-[160px] rounded-xl">
                            <DropdownMenuItem onClick={() => handleUpdateOrderStatus(order, 'pending')} className="gap-2 cursor-pointer font-bold text-yellow-500"><Clock className="w-4 h-4" /> Mark Pending</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateOrderStatus(order, 'shipped')} className="gap-2 cursor-pointer font-bold text-blue-500"><Truck className="w-4 h-4" /> Mark Shipped</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateOrderStatus(order, 'delivered')} className="gap-2 cursor-pointer font-bold text-green-500"><CheckCircle2 className="w-4 h-4" /> Mark Delivered</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!ordersLoading && orders?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-20 text-center glass rounded-2xl">
                        <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                        <p className="font-bold text-muted-foreground">No orders recorded in the vault.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
