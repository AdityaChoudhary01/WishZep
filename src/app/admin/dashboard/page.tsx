"use client";

import { useState, useRef, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Plus, 
  Loader2, 
  Edit2, 
  Trash2, 
  ImagePlus, 
  ShoppingBag, 
  Tags, 
  X, 
  Info, 
  ShieldAlert, 
  Zap,
  Images,
  Ruler,
  Settings2,
  AlertCircle,
  Truck,
  CreditCard,
  Calendar,
  User,
  MapPin,
  Phone,
  MoreVertical,
  Check
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, setDoc, updateDoc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import BrandLogo from '@/components/BrandLogo';

// --- Sub-components ---

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
        <div key={item.id} className="flex gap-3 md:gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100 items-center">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white">
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
          <p className="font-black text-primary text-xs whitespace-nowrap">Rs.{(item.price * item.quantity).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

// --- Main Dashboard ---

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('products');
  const [isUploading, setIsUploading] = useState(false);
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
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const sizeChartInputRef = useRef<HTMLInputElement>(null);

  const adminRoleRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'roles_admin', user.uid);
  }, [db, user]);

  const { data: adminRole, isLoading: adminLoading } = useDoc(adminRoleRef);
  const isUserAdmin = !!adminRole;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isUserLoading, router]);

  const productsQuery = useMemoFirebase(() => {
    if (!db || !isUserAdmin) return null;
    return query(collection(db, 'products'), orderBy('name', 'asc'));
  }, [db, isUserAdmin]);
  const { data: products } = useCollection(productsQuery);

  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !isUserAdmin) return null;
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db, isUserAdmin]);
  const { data: categories } = useCollection(categoriesQuery);

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !isUserAdmin || activeTab !== 'orders') return null;
    return collection(db, 'orders');
  }, [db, isUserAdmin, activeTab]);
  const { data: rawOrders } = useCollection(ordersQuery);

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

  const isApparel = ['clothes', 'clothing', 'apparel', 'shirt', 'hoodie', 'bottoms', 'wear', 't-shirt', 'jacket'].some(k => productFormData.category.toLowerCase().includes(k));

  const handleSaveProduct = async () => {
    if (!db || !isUserAdmin) return;
    
    if (!productFormData.name || !productFormData.category || !productFormData.price) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please fill in all required product details." });
      return;
    }

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
      sizes: isApparel ? productFormData.sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
      sizeChartUrl: isApparel ? productFormData.sizeChartUrl : '',
      specifications: specsObject,
      updatedAt: serverTimestamp(),
      createdAt: editingProduct ? (editingProduct.createdAt || serverTimestamp()) : serverTimestamp()
    };

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        toast({ title: "Product updated successfully!" });
      } else {
        const newDocRef = doc(collection(db, 'products'));
        await setDoc(newDocRef, { ...productData, id: newDocRef.id });
        toast({ title: "Product added to shop!" });
      }
      setIsProductDialogOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Save failed." });
    }
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setProductFormData(prev => ({ ...prev, imageUrl: url }));
      toast({ title: "Main Image Uploaded" });
    } catch (error) {
      toast({ variant: "destructive", title: "Upload failed." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadToCloudinary(files[i]);
        newUrls.push(url);
      }
      setProductFormData(prev => ({ ...prev, images: [...prev.images, ...newUrls] }));
      toast({ title: `${files.length} Gallery images added` });
    } catch (error) {
      toast({ variant: "destructive", title: "Gallery upload failed." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSizeChartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setProductFormData(prev => ({ ...prev, sizeChartUrl: url }));
      toast({ title: "Size Chart Uploaded" });
    } catch (error) {
      toast({ variant: "destructive", title: "Upload failed." });
    } finally {
      setIsUploading(false);
    }
  };

  const removeGalleryImage = (idx: number) => {
    setProductFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx)
    }));
  };

  const addSpecification = () => {
    setProductFormData(prev => ({
      ...prev,
      specifications: [...prev.specifications, { key: '', value: '' }]
    }));
  };

  const updateSpecification = (idx: number, field: 'key' | 'value', val: string) => {
    const newSpecs = [...productFormData.specifications];
    newSpecs[idx][field] = val;
    setProductFormData(prev => ({ ...prev, specifications: newSpecs }));
  };

  const removeSpecification = (idx: number) => {
    setProductFormData(prev => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== idx)
    }));
  };

  const handleDeleteProduct = async (id: string) => {
    if (!db || !isUserAdmin || !window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast({ title: "Product Deleted." });
    } catch (error) {
      toast({ variant: "destructive", title: "Delete failed." });
    }
  };

  if (isUserLoading || adminLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>;
  }

  if (!isUserAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center space-y-6">
        <ShieldAlert className="w-20 h-20 text-destructive" />
        <h1 className="text-3xl font-black uppercase">Admin Access Required</h1>
        <Button onClick={() => router.push('/')} variant="outline" className="rounded-full">Back to Home</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 p-8 hidden md:block h-screen sticky top-0 shrink-0">
        <div className="mb-12 flex justify-center"><BrandLogo size="md" showText={false} /></div>
        <nav className="space-y-2">
          {[
            { id: 'products', label: 'All Products', icon: Package },
            { id: 'categories', label: 'Categories', icon: Tags },
            { id: 'orders', label: 'Customer Orders', icon: ShoppingBag },
          ].map((link) => (
            <button 
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-2xl h-12 px-4 transition-all text-sm font-bold",
                activeTab === link.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "hover:bg-primary/5 text-gray-600"
              )}
            >
              <link.icon className="w-5 h-5" /> {link.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 w-full max-w-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden mb-6 flex justify-center py-2"><BrandLogo size="sm" /></div>

        {activeTab === 'products' && (
          <div className="space-y-6 md:space-y-8 animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Product <span className="wishzep-text">Inventory</span></h1>
                <p className="text-muted-foreground text-sm font-medium">Manage and list your products.</p>
              </div>
              <Button onClick={() => handleOpenProductDialog()} className="w-full md:w-auto rounded-xl h-12 px-6 font-bold gap-2 shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5" /> ADD NEW PRODUCT
              </Button>
            </header>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-bold px-6">Product Details</TableHead>
                    <TableHead className="font-bold">Category</TableHead>
                    <TableHead className="font-bold">Stock</TableHead>
                    <TableHead className="font-bold">Price</TableHead>
                    <TableHead className="text-right font-bold px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.map((p) => (
                    <TableRow key={p.id} className="hover:bg-gray-50/50 h-20">
                      <TableCell className="font-bold px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden relative border border-gray-100 shrink-0">
                            <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                          </div>
                          <span className="text-sm font-bold line-clamp-1">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] font-bold uppercase">{p.category}</Badge></TableCell>
                      <TableCell className="font-medium text-muted-foreground text-sm">{p.inventory} Units</TableCell>
                      <TableCell className="font-bold text-primary">Rs.{p.discountPrice || p.price}</TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9" onClick={() => handleOpenProductDialog(p)}><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive rounded-lg h-9 w-9" onClick={() => handleDeleteProduct(p.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {products?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">No products found. Add your first product.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {products?.map((p) => (
                 <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-16 h-16 rounded-xl overflow-hidden relative border border-gray-100 shrink-0">
                      <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">{p.category}</p>
                      <h4 className="font-bold text-sm truncate">{p.name}</h4>
                      <p className="text-xs text-primary font-black mt-1">Rs.{p.discountPrice || p.price}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{p.inventory} in stock</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="icon" className="rounded-lg h-8 w-8" onClick={() => handleOpenProductDialog(p)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" size="icon" className="rounded-lg h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleDeleteProduct(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                 </div>
              ))}
              {products?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-2xl">No products found.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6 md:space-y-8 animate-fade-in">
             <header>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Category <span className="wishzep-text">Management</span></h1>
              <p className="text-muted-foreground text-sm font-medium">Organize products into groups.</p>
            </header>
            <div className="grid md:grid-cols-3 gap-6 md:gap-10">
              <div className="bg-white p-5 md:p-6 rounded-2xl space-y-6 border border-gray-100 shadow-sm h-fit">
                <h3 className="text-xl font-bold">Add Category</h3>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Category Name</Label>
                  <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Shoes, T-Shirts" className="h-12 rounded-xl" />
                </div>
                <Button onClick={handleAddCategory} disabled={!newCategory} className="w-full rounded-xl h-12 bg-primary font-bold">ADD CATEGORY</Button>
              </div>
              <div className="md:col-span-2 bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="md:hidden">
                   {categories?.map((cat) => (
                     <div key={cat.id} className="p-4 border-b last:border-0 flex justify-between items-center">
                       <span className="font-bold">{cat.name}</span>
                       <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deleteDoc(doc(db!, 'categories', cat.id))}><Trash2 className="w-4 h-4" /></Button>
                     </div>
                   ))}
                </div>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader className="bg-gray-50"><TableRow><TableHead className="px-6 font-bold">Category Name</TableHead><TableHead className="text-right px-6 font-bold">Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {categories?.map((cat) => (
                        <TableRow key={cat.id} className="h-16"><TableCell className="px-6 font-bold">{cat.name}</TableCell><TableCell className="text-right px-6"><Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDoc(doc(db!, 'categories', cat.id))}><Trash2 className="w-4 h-4" /></Button></TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6 md:space-y-8 animate-fade-in">
             <header>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Order <span className="wishzep-text">History</span></h1>
              <p className="text-muted-foreground text-sm font-medium">Track and update customer orders.</p>
            </header>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-bold px-6">Order ID</TableHead>
                    <TableHead className="font-bold">Customer</TableHead>
                    <TableHead className="font-bold">Amount</TableHead>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="text-right font-bold px-6">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order) => (
                    <TableRow key={order.id} className="h-20">
                      <TableCell className="px-6 font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-bold text-sm">{order.shippingDetails?.fullName}</TableCell>
                      <TableCell className="font-bold text-primary">Rs.{order.totalAmount?.toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-medium text-muted-foreground">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("px-3 py-1 rounded-full text-[9px] font-bold", order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                          {order.status?.toUpperCase() || 'PENDING'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <OrderDetailsDialog order={order} handleUpdateOrderStatus={handleUpdateOrderStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedOrders.length === 0 && <TableRow><TableCell colSpan={6} className="h-40 text-center text-muted-foreground">No orders found.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden grid gap-4">
              {sortedOrders.map((order) => (
                <div key={order.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                   <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">#{order.id.slice(0, 8)}</p>
                        <h4 className="font-bold text-base">{order.shippingDetails?.fullName}</h4>
                      </div>
                      <Badge className={cn("px-2.5 py-1 rounded-full text-[9px] font-bold", order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                        {order.status?.toUpperCase() || 'PENDING'}
                      </Badge>
                   </div>
                   <div className="flex justify-between items-end border-t border-gray-50 pt-3">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Amount</p>
                        <p className="text-lg font-black text-primary">Rs.{order.totalAmount?.toLocaleString()}</p>
                      </div>
                      <OrderDetailsDialog order={order} handleUpdateOrderStatus={handleUpdateOrderStatus} isMobile />
                   </div>
                </div>
              ))}
              {sortedOrders.length === 0 && <div className="text-center py-12 text-muted-foreground border border-dashed rounded-2xl">No orders found.</div>}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 z-50 flex justify-around pb-safe safe-area-bottom">
        {[
          { id: 'products', label: 'Products', icon: Package },
          { id: 'categories', label: 'Categories', icon: Tags },
          { id: 'orders', label: 'Orders', icon: ShoppingBag },
        ].map((link) => (
           <button 
             key={link.id}
             onClick={() => setActiveTab(link.id)}
             className={cn(
               "flex flex-col items-center justify-center p-2 rounded-xl transition-all w-20",
               activeTab === link.id ? "text-primary bg-primary/5" : "text-gray-400"
             )}
           >
             <link.icon className={cn("w-6 h-6 mb-1", activeTab === link.id && "fill-current")} />
             <span className="text-[9px] font-bold uppercase tracking-wide">{link.label}</span>
           </button>
        ))}
      </div>

      {/* Product Management Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="w-[95vw] md:max-w-4xl rounded-[2rem] border-none max-h-[90vh] overflow-y-auto p-0 bg-white shadow-3xl">
          <div className="sticky top-0 z-50 bg-white border-b border-gray-100 p-4 md:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                {editingProduct ? <Edit2 className="w-5 h-5 md:w-6 md:h-6 text-primary" /> : <Plus className="w-5 h-5 md:w-6 md:h-6 text-primary" />}
                {editingProduct ? 'Update Product' : 'Add New Product'}
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="p-4 md:p-8 space-y-8 md:space-y-10">
            {/* Section 1: Basic Details */}
            <div className="space-y-4 md:space-y-6">
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" /> Basic Details
              </h3>
              <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Product Name*</Label>
                  <Input placeholder="Enter product name" value={productFormData.name} onChange={(e) => setProductFormData({...productFormData, name: e.target.value})} className="h-12 rounded-xl font-medium" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Category*</Label>
                  <Select value={productFormData.category} onValueChange={(val) => setProductFormData({...productFormData, category: val})}>
                    <SelectTrigger className="h-12 rounded-xl font-medium"><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent className="bg-white">{categories?.map(cat => <SelectItem key={cat.id} value={cat.name} className="font-medium">{cat.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Product Description</Label>
                  <Textarea placeholder="Tell customers about this product..." value={productFormData.description} onChange={(e) => setProductFormData({...productFormData, description: e.target.value})} className="min-h-[120px] rounded-xl p-4 text-sm font-medium" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 2: Pricing and Stock */}
            <div className="space-y-4 md:space-y-6">
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" /> Pricing & Inventory
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">MRP (Original)*</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                    <Input type="number" placeholder="0.00" value={productFormData.price} onChange={(e) => setProductFormData({...productFormData, price: e.target.value})} className="h-12 pl-8 rounded-xl font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-primary uppercase">Selling Price</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">₹</span>
                    <Input type="number" placeholder="0.00" value={productFormData.discountPrice} onChange={(e) => setProductFormData({...productFormData, discountPrice: e.target.value})} className="h-12 pl-8 rounded-xl font-bold border-primary/20 bg-primary/5 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Stock (Units)</Label>
                  <Input type="number" placeholder="0" value={productFormData.inventory} onChange={(e) => setProductFormData({...productFormData, inventory: e.target.value})} className="h-12 rounded-xl font-bold" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 3: Photos */}
            <div className="space-y-4 md:space-y-6">
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" /> Product Images
              </h3>
              <div className="grid md:grid-cols-2 gap-4 md:gap-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Main Product Image</Label>
                  <div className="relative aspect-video rounded-2xl overflow-hidden group cursor-pointer border-2 border-dashed border-gray-200 hover:border-primary transition-all flex flex-col items-center justify-center text-gray-400 bg-gray-50" onClick={() => fileInputRef.current?.click()}>
                    {productFormData.imageUrl ? <Image src={productFormData.imageUrl} alt="Main" fill className="object-cover" /> : isUploading ? <Loader2 className="w-10 h-10 animate-spin text-primary" /> : <div className="text-center"><ImagePlus className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-[10px] font-bold">Click to Upload</p></div>}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMainImageUpload} />
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Product Gallery</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {productFormData.images.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100">
                        <Image src={img} alt="Gallery" fill className="object-cover" />
                        <button onClick={() => removeGalleryImage(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                    <button onClick={() => galleryInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center hover:bg-primary/5 hover:border-primary transition-all text-gray-400">
                      <Plus className="w-5 h-5 mb-1" />
                      <span className="text-[8px] font-bold">ADD</span>
                    </button>
                    <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" multiple onChange={handleGalleryUpload} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Apparel Specifics (Size Chart) */}
            {isApparel && (
              <>
                <Separator />
                <div className="space-y-4 md:space-y-6 bg-gray-50/50 p-4 md:p-6 rounded-2xl border border-gray-100">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                    <Ruler className="w-4 h-4" /> Size Settings
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 md:gap-8">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Available Sizes</Label>
                      <Input placeholder="S, M, L, XL" value={productFormData.sizes} onChange={(e) => setProductFormData({...productFormData, sizes: e.target.value})} className="h-12 rounded-xl font-bold bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Size Chart Image</Label>
                      <div className="relative h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-white cursor-pointer group hover:border-primary transition-colors" onClick={() => sizeChartInputRef.current?.click()}>
                        {productFormData.sizeChartUrl ? <Image src={productFormData.sizeChartUrl} alt="Size Chart" fill className="object-contain" /> : <div className="text-center"><ImagePlus className="w-5 h-5 mx-auto mb-1 opacity-40" /><p className="text-[8px] font-bold text-muted-foreground">Upload Chart</p></div>}
                      </div>
                      <input type="file" ref={sizeChartInputRef} className="hidden" accept="image/*" onChange={handleSizeChartUpload} />
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Section 5: Technical Details */}
            <div className="space-y-4 md:space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <Settings2 className="w-4 h-4" /> Specs
                </h3>
                <Button variant="outline" size="sm" onClick={addSpecification} className="h-8 rounded-lg border-dashed text-xs font-bold">
                  + Add Detail
                </Button>
              </div>
              <div className="grid gap-3">
                {productFormData.specifications.length === 0 && (
                  <p className="text-[10px] text-center text-muted-foreground py-4 border border-dashed rounded-xl">No extra details added.</p>
                )}
                {productFormData.specifications.map((spec, i) => (
                  <div key={i} className="flex gap-2 md:gap-3 items-center animate-in slide-in-from-top-1">
                    <Input placeholder="Name" value={spec.key} onChange={(e) => updateSpecification(i, 'key', e.target.value)} className="h-10 rounded-lg text-sm" />
                    <Input placeholder="Value" value={spec.value} onChange={(e) => updateSpecification(i, 'value', e.target.value)} className="h-10 rounded-lg text-sm" />
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeSpecification(i)}><X className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-8 flex flex-col sm:flex-row gap-3 md:gap-4 sticky bottom-0 bg-white/80 backdrop-blur-md pb-safe">
              <Button variant="ghost" onClick={() => setIsProductDialogOpen(false)} className="rounded-xl h-12 px-8 font-bold flex-1">CANCEL</Button>
              <Button onClick={handleSaveProduct} className="rounded-xl h-12 px-12 font-bold bg-primary flex-[2] text-white shadow-xl shadow-primary/20 transition-all active:scale-95">
                {editingProduct ? 'UPDATE' : 'ADD PRODUCT'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Extracted for cleaner return block
function OrderDetailsDialog({ order, handleUpdateOrderStatus, isMobile }: any) {
  return (
    <Dialog>
      <DialogTrigger asChild>
         {isMobile ? (
           <Button variant="outline" className="rounded-xl h-9 text-xs font-bold px-4">View Details</Button>
         ) : (
           <Button variant="ghost" size="icon" className="rounded-lg"><Info className="w-5 h-5" /></Button>
         )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] md:max-w-3xl rounded-[2rem] bg-white border-none p-0 overflow-hidden shadow-2xl">
          <div className="bg-primary p-4 md:p-6 text-white"><DialogHeader><DialogTitle className="text-xl md:text-2xl font-black uppercase tracking-tight">ORDER DETAILS</DialogTitle></DialogHeader></div>
          <div className="p-5 md:p-8 space-y-6 md:space-y-8 max-h-[75vh] overflow-y-auto">
            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2"><MapPin className="w-3 h-3" /> Shipping Address</h4>
                  <div className="p-4 rounded-xl bg-gray-50 space-y-1 border border-gray-100">
                    <p className="font-bold text-sm">{order.shippingDetails?.fullName}</p>
                    <div className="flex flex-col gap-0.5 pt-1">
                        <p className="text-xs font-bold text-primary flex items-center gap-1.5"><Phone className="w-3 h-3" /> {order.shippingDetails?.contactNumber}</p>
                        {order.shippingDetails?.secondaryContact && (
                          <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5 ml-0.5"><Phone className="w-2.5 h-2.5" /> {order.shippingDetails?.secondaryContact}</p>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 leading-relaxed">{order.shippingDetails?.address}, {order.shippingDetails?.city} - {order.shippingDetails?.zip}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2"><CreditCard className="w-3 h-3" /> Payment & History</h4>
                  <div className="p-4 rounded-xl bg-gray-50 space-y-3 border border-gray-100">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Method</span>
                        <span className="text-xs font-black">{order.paymentMethod || 'Razorpay'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Placed On</span>
                        <span className="text-xs font-black flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Paid</span>
                        <span className="text-lg font-black text-primary">Rs.{order.totalAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2"><ShoppingBag className="w-3 h-3" /> Ordered Items</h4>
                  <AdminOrderItemsList orderId={order.id} />
              </div>
            </div>
            
            <Separator className="bg-gray-100" />
            
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Update Order Status</h4>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <Button onClick={() => handleUpdateOrderStatus(order.id, 'shipped')} className="flex-1 rounded-xl h-12 font-bold gap-2">
                  <Truck className="w-4 h-4" /> MARK AS SHIPPED
                </Button>
                <Button onClick={() => handleUpdateOrderStatus(order.id, 'delivered')} variant="outline" className="flex-1 rounded-xl h-12 font-bold border-primary text-primary hover:bg-primary/5">
                  MARK AS DELIVERED
                </Button>
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  )
}
