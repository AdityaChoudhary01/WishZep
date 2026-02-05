
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
  Info,
  User,
  MapPin,
  CreditCard
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

function AdminOrderItemsList({ orderId }: { orderId: string }) {
  const db = useFirestore();
  const itemsQuery = useMemoFirebase(() => {
    if (!db || !orderId) return null;
    return query(collection(db, 'orders', orderId, 'order_items'));
  }, [db, orderId]);

  const { data: items, isLoading } = useCollection(itemsQuery);

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      {items?.map((item) => (
        <div key={item.id} className="flex gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100 items-center">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
            {item.image ? (
              <Image src={item.image} alt={item.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200"><Package className="w-4 h-4 text-gray-400" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="font-bold text-xs truncate">{item.name}</h5>
            <p className="text-[10px] text-muted-foreground uppercase font-black">{item.quantity} Units @ Rs.{item.price?.toLocaleString()}</p>
          </div>
          <p className="font-black text-primary text-xs">Rs.{(item.price * item.quantity).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('products');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirmedAdmin, setIsConfirmedAdmin] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  
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

  const adminRoleRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'roles_admin', user.uid);
  }, [db, user]);

  const { data: adminRole, isLoading: adminLoading } = useDoc(adminRoleRef);
  const isUserAdmin = !!adminRole && !adminLoading;

  useEffect(() => {
    if (isUserAdmin) {
      setIsConfirmedAdmin(true);
    } else {
      setIsConfirmedAdmin(false);
    }
  }, [isUserAdmin]);

  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'products'), orderBy('name', 'asc'));
  }, [db]);
  const { data: products } = useCollection(productsQuery);

  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db]);
  const { data: categories } = useCollection(categoriesQuery);

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !isConfirmedAdmin || activeTab !== 'orders') return null;
    // Removed server-side orderBy to prevent index errors in dev
    return collection(db, 'orders');
  }, [db, isConfirmedAdmin, activeTab]);
  const { data: rawOrders, isLoading: ordersLoading } = useCollection(ordersQuery);

  const sortedOrders = useMemo(() => {
    if (!rawOrders) return [];
    return [...rawOrders].sort((a, b) => {
      const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
      const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [rawOrders]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!db || !isUserAdmin) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Status Updated", description: `Order is now ${newStatus}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" });
    }
  };

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

  const handleSaveProduct = async () => {
    if (!db || !isUserAdmin) return;
    
    const specsObject: Record<string, string> = {};
    productFormData.specifications.forEach(s => {
      if (s.key.trim()) specsObject[s.key.trim()] = s.value;
    });

    const isApparel = ['apparel', 'clothing', 't-shirt', 'shirt', 'hoodie', 'bottoms'].some(k => productFormData.category.toLowerCase().includes(k));

    const productData = {
      name: productFormData.name,
      description: productFormData.description,
      price: parseFloat(productFormData.price) || 0,
      discountPrice: productFormData.discountPrice ? parseFloat(productFormData.discountPrice) : 0,
      inventory: parseInt(productFormData.inventory) || 0,
      category: productFormData.category,
      imageUrl: productFormData.imageUrl,
      images: productFormData.images,
      sizes: isApparel ? productFormData.sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
      sizeChartUrl: isApparel ? productFormData.sizeChartUrl : '',
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setProductFormData(prev => ({ ...prev, imageUrl: url }));
      toast({ title: "Image Uploaded!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Upload Failed" });
    } finally {
      setIsUploading(false);
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
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 mb-2">Management</p>
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
      <aside className="w-64 bg-white border-r border-gray-100 p-6 hidden md:block h-screen sticky top-0 z-30">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center rotate-12"><span className="text-white font-black text-2xl">W</span></div>
          <span className="text-xl font-bold wishzep-text tracking-tighter">ADMIN</span>
        </div>
        <SidebarContent />
      </aside>

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
                <h1 className="text-4xl font-black tracking-tight uppercase">Product <span className="wishzep-text">Vault</span></h1>
                <p className="text-muted-foreground text-sm font-medium">Manage your curated high-energy catalogue.</p>
              </div>
              <Button onClick={() => handleOpenProductDialog()} className="rounded-2xl h-14 px-8 font-black gap-2 shadow-xl shadow-primary/20">
                <Plus className="w-6 h-6" /> ADD PRODUCT
              </Button>
            </header>

            <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6">Product</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Category</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Stock</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Price</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.map((p) => (
                    <TableRow key={p.id} className="hover:bg-gray-50/50 border-gray-50 h-20">
                      <TableCell className="font-bold px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden relative border border-gray-100">
                            <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                          </div>
                          <span className="truncate max-w-[200px] text-sm font-black">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px] font-black uppercase">{p.category}</Badge></TableCell>
                      <TableCell className="font-bold text-muted-foreground text-xs">{p.inventory} UNITS</TableCell>
                      <TableCell className="font-black text-primary text-sm">Rs.{p.discountPrice || p.price}</TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary" onClick={() => handleOpenProductDialog(p)}><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleDeleteProduct(p.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6 animate-fade-in">
             <header>
              <h1 className="text-4xl font-black tracking-tight uppercase">Filing <span className="wishzep-text">System</span></h1>
              <p className="text-muted-foreground text-sm font-medium">Organize artifacts into logical groupings.</p>
            </header>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-[2rem] space-y-6 border border-gray-100 shadow-sm">
                <h3 className="text-2xl font-black text-gray-900">New Category</h3>
                <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Footwear" className="h-14 rounded-2xl bg-gray-50 font-bold border-gray-200" />
                <Button onClick={handleAddCategory} disabled={!newCategory} className="w-full rounded-2xl h-14 bg-primary font-black text-white">ADD CATEGORY</Button>
              </div>
              <div className="md:col-span-2 bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
                <Table>
                  <TableHeader className="bg-gray-50"><TableRow><TableHead className="px-8 font-black uppercase text-[10px]">Name</TableHead><TableHead className="text-right px-8 font-black uppercase text-[10px]">Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {categories?.map((cat) => (
                      <TableRow key={cat.id} className="h-20 border-gray-100"><TableCell className="px-8 font-black text-lg">{cat.name}</TableCell><TableCell className="text-right px-8"><Button variant="ghost" size="icon" className="text-destructive rounded-xl" onClick={() => deleteDoc(doc(db!, 'categories', cat.id))}><Trash2 className="w-5 h-5" /></Button></TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fade-in">
            <header>
              <h1 className="text-4xl font-black tracking-tight uppercase">Logistics <span className="wishzep-text">Control</span></h1>
              <p className="text-muted-foreground text-sm font-medium">Fulfill and track customer artifact deliveries.</p>
            </header>

            <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-8">Order ID</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Customer</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Total</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest px-8">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order) => (
                    <TableRow key={order.id} className="h-24 hover:bg-gray-50/50">
                      <TableCell className="px-8 font-black font-mono text-[11px]">{order.id.slice(0, 10)}</TableCell>
                      <TableCell className="font-bold text-sm">{order.shippingDetails?.fullName}</TableCell>
                      <TableCell className="font-black text-primary">Rs.{order.totalAmount?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "px-4 py-1.5 rounded-full text-[9px] uppercase font-black border-none",
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                        )}>{order.status?.toUpperCase() || 'PENDING'}</Badge>
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary"><Info className="w-5 h-5" /></Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl rounded-[2.5rem] bg-white border-none p-0 overflow-hidden shadow-2xl">
                            <div className="bg-primary p-8 text-white flex justify-between items-center">
                              <div><h2 className="text-3xl font-black tracking-tighter">FULFILLMENT LOG</h2><p className="text-xs font-bold opacity-80 uppercase tracking-widest mt-1">ID: {order.id}</p></div>
                              <div className="text-right"><p className="text-xs font-bold uppercase opacity-80 mb-1">Status</p><Badge className="bg-white text-primary font-black uppercase px-4 py-1.5 rounded-full border-none">{order.status?.toUpperCase() || 'PENDING'}</Badge></div>
                            </div>
                            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                              <div className="grid md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                  <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><User className="w-3.5 h-3.5" /> Recipient Intelligence</h4>
                                    <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                      <div><p className="text-[9px] font-bold text-muted-foreground uppercase">Full Name</p><p className="font-black">{order.shippingDetails?.fullName}</p></div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div><p className="text-[9px] font-bold text-muted-foreground uppercase">Primary Contact</p><p className="font-bold text-sm text-primary">{order.shippingDetails?.contactNumber}</p></div>
                                        <div><p className="text-[9px] font-bold text-muted-foreground uppercase">Secondary</p><p className="font-bold text-sm">{order.shippingDetails?.secondaryContact || 'N/A'}</p></div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Destination coordinates</h4>
                                    <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                                      <p className="text-sm font-bold leading-relaxed">{order.shippingDetails?.address}</p>
                                      <p className="text-sm font-black text-muted-foreground">{order.shippingDetails?.city}, {order.shippingDetails?.zip}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-6">
                                  <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><Package className="w-3.5 h-3.5" /> Artifact Batch</h4>
                                    <AdminOrderItemsList orderId={order.id} />
                                  </div>
                                  <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> Summary</h4>
                                    <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                                      <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase">Gateway</span><span className="text-xs font-bold">{order.paymentMethod}</span></div>
                                      <div className="flex justify-between items-center pt-2 border-t border-gray-200"><span className="text-xs font-black">TOTAL</span><span className="text-lg font-black text-primary">Rs.{order.totalAmount?.toLocaleString()}</span></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <Separator className="bg-gray-100" />
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Execution Control</h4>
                                <div className="flex flex-wrap gap-4">
                                  <Button onClick={() => handleUpdateOrderStatus(order.id, 'pending')} variant="outline" className="flex-1 h-14 rounded-xl gap-3 font-bold text-yellow-600 hover:bg-yellow-50 border-yellow-200"><Clock className="w-5 h-5" /> PENDING</Button>
                                  <Button onClick={() => handleUpdateOrderStatus(order.id, 'shipped')} variant="outline" className="flex-1 h-14 rounded-xl gap-3 font-bold text-blue-600 hover:bg-blue-50 border-blue-200"><Truck className="w-5 h-5" /> SHIPPED</Button>
                                  <Button onClick={() => handleUpdateOrderStatus(order.id, 'delivered')} variant="outline" className="flex-1 h-14 rounded-xl gap-3 font-bold text-green-600 hover:bg-green-50 border-green-200"><CheckCircle2 className="w-5 h-5" /> DELIVERED</Button>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-4xl rounded-[2rem] border-none max-h-[90vh] overflow-y-auto p-0 bg-white shadow-2xl">
          <div className="sticky top-0 z-50 bg-white border-b border-gray-100 p-8 flex justify-between items-center">
            <h2 className="text-3xl font-black text-gray-900">{editingProduct ? 'EDIT ARTIFACT' : 'NEW ARTIFACT'}</h2>
          </div>
          <div className="p-8 space-y-10">
            <div className="grid lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Core specs</Label>
                  <Input placeholder="Product Name" value={productFormData.name} onChange={(e) => setProductFormData({...productFormData, name: e.target.value})} className="h-14 rounded-2xl bg-gray-50 text-lg font-bold border-gray-200 focus:bg-white transition-all" />
                  <Select value={productFormData.category} onValueChange={(val) => setProductFormData({...productFormData, category: val})}>
                    <SelectTrigger className="h-14 rounded-2xl bg-gray-50 font-bold border-gray-200"><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent className="bg-white">{categories?.map(cat => <SelectItem key={cat.id} value={cat.name} className="font-bold">{cat.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-500">Retail Price</Label><Input type="number" value={productFormData.price} onChange={(e) => setProductFormData({...productFormData, price: e.target.value})} className="h-12 rounded-xl bg-gray-50 font-bold" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-primary">Drop Price</Label><Input type="number" value={productFormData.discountPrice} onChange={(e) => setProductFormData({...productFormData, discountPrice: e.target.value})} className="h-12 rounded-xl bg-gray-50 font-bold border-primary/20" /></div>
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-500">Inventory Level</Label><Input type="number" value={productFormData.inventory} onChange={(e) => setProductFormData({...productFormData, inventory: e.target.value})} className="h-12 rounded-xl bg-gray-50 font-bold" /></div>
              </div>
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><Camera className="w-3 h-3" /> Visual Master</Label>
                  <div className="relative aspect-[4/3] rounded-3xl overflow-hidden group cursor-pointer border-2 border-dashed border-gray-200 hover:border-primary/50 transition-all bg-gray-50 flex flex-col items-center justify-center text-gray-400" onClick={() => fileInputRef.current?.click()}>
                    {productFormData.imageUrl ? <Image src={productFormData.imageUrl} alt="Preview" fill className="object-cover" /> : isUploading ? <Loader2 className="w-10 h-10 animate-spin text-primary" /> : <ImagePlus className="w-10 h-10" />}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Narrative description</Label>
              <Textarea value={productFormData.description} placeholder="Describe the energy of this artifact..." onChange={(e) => setProductFormData({...productFormData, description: e.target.value})} className="rounded-2xl bg-gray-50 min-h-[160px] p-6 leading-relaxed border-gray-200" />
            </div>
            <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
              <Button variant="outline" onClick={() => setIsProductDialogOpen(false)} className="rounded-2xl h-16 px-10 font-bold flex-1 border-gray-200">DISCARD</Button>
              <Button onClick={handleSaveProduct} className="rounded-2xl h-16 px-20 font-black bg-primary flex-[2] text-white shadow-xl shadow-primary/20">{editingProduct ? 'UPDATE ARTIFACT' : 'RELEASE ARTIFACT'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
