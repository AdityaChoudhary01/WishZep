
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
  Settings2
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
import Link from 'next/link';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, setDoc, updateDoc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import BrandLogo from '@/components/BrandLogo';

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
        toast({ title: "Product updated!" });
      } else {
        const newDocRef = doc(collection(db, 'products'));
        await setDoc(newDocRef, { ...productData, id: newDocRef.id });
        toast({ title: "Product added!" });
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
      toast({ title: "Primary Photo Updated" });
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
      toast({ title: `${files.length} Gallery Photos Added` });
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
      toast({ title: "Size Chart Updated" });
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
    if (!db || !isUserAdmin || !window.confirm("Permanent Delete?")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast({ title: "Deleted." });
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
        <h1 className="text-3xl font-black uppercase">Admin Required</h1>
        <Button onClick={() => router.push('/')} variant="outline" className="rounded-full">Back Home</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="w-64 bg-white border-r border-gray-100 p-8 hidden md:block h-screen sticky top-0">
        <div className="mb-12"><BrandLogo size="md" /></div>
        <nav className="space-y-2">
          {[
            { id: 'products', label: 'Items', icon: Package },
            { id: 'categories', label: 'Groups', icon: Tags },
            { id: 'orders', label: 'Orders', icon: ShoppingBag },
          ].map((link) => (
            <button 
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-2xl h-12 px-4 transition-all text-sm font-bold",
                activeTab === link.id ? "bg-primary text-white shadow-lg" : "hover:bg-primary/5 text-gray-600"
              )}
            >
              <link.icon className="w-5 h-5" /> {link.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8 space-y-12">
        {activeTab === 'products' && (
          <div className="space-y-8 animate-fade-in">
            <header className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-black uppercase">Product <span className="wishzep-text">Drop</span></h1>
                <p className="text-muted-foreground font-medium">Calibrate your shop inventory.</p>
              </div>
              <Button onClick={() => handleOpenProductDialog()} className="rounded-2xl h-14 px-8 font-black gap-2 shadow-xl shadow-primary/20">
                <Plus className="w-6 h-6" /> NEW DROP
              </Button>
            </header>

            <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-black px-6">Artifact</TableHead>
                    <TableHead className="font-black">Group</TableHead>
                    <TableHead className="font-black">Stock</TableHead>
                    <TableHead className="font-black">Price</TableHead>
                    <TableHead className="text-right font-black px-6">Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.map((p) => (
                    <TableRow key={p.id} className="hover:bg-gray-50/50 h-24">
                      <TableCell className="font-bold px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden relative border border-gray-100">
                            <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                          </div>
                          <span className="text-sm font-black">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] font-black uppercase">{p.category}</Badge></TableCell>
                      <TableCell className="font-bold text-muted-foreground text-sm">{p.inventory} Units</TableCell>
                      <TableCell className="font-black text-primary">Rs.{p.discountPrice || p.price}</TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => handleOpenProductDialog(p)}><Edit2 className="w-5 h-5" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive rounded-xl" onClick={() => handleDeleteProduct(p.id)}><Trash2 className="w-5 h-5" /></Button>
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
          <div className="space-y-8 animate-fade-in">
             <header>
              <h1 className="text-4xl font-black uppercase">Category <span className="wishzep-text">Vault</span></h1>
              <p className="text-muted-foreground font-medium">Organize artifacts into logical groupings.</p>
            </header>
            <div className="grid md:grid-cols-3 gap-10">
              <div className="bg-white p-8 rounded-[2rem] space-y-6 border border-gray-100 shadow-sm h-fit">
                <h3 className="text-2xl font-black">Add Group</h3>
                <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Outerwear" className="h-14 rounded-2xl" />
                <Button onClick={handleAddCategory} disabled={!newCategory} className="w-full rounded-2xl h-14 bg-primary font-black">SYNC GROUP</Button>
              </div>
              <div className="md:col-span-2 bg-white rounded-[2rem] overflow-hidden border border-gray-100">
                <Table>
                  <TableHeader className="bg-gray-50"><TableRow><TableHead className="px-8 font-black">Group Name</TableHead><TableHead className="text-right px-8 font-black">Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {categories?.map((cat) => (
                      <TableRow key={cat.id} className="h-20"><TableCell className="px-8 font-black text-lg">{cat.name}</TableCell><TableCell className="text-right px-8"><Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDoc(doc(db!, 'categories', cat.id))}><Trash2 className="w-5 h-5" /></Button></TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-8 animate-fade-in">
             <header>
              <h1 className="text-4xl font-black uppercase">Fulfillment <span className="wishzep-text">Log</span></h1>
              <p className="text-muted-foreground font-medium">Manage customer order transmissions.</p>
            </header>
            <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-black px-8">Order ID</TableHead>
                    <TableHead className="font-black">Client</TableHead>
                    <TableHead className="font-black">Value</TableHead>
                    <TableHead className="font-black">Status</TableHead>
                    <TableHead className="text-right font-black px-8">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order) => (
                    <TableRow key={order.id} className="h-24">
                      <TableCell className="px-8 font-mono text-[11px] font-black">{order.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-bold">{order.shippingDetails?.fullName}</TableCell>
                      <TableCell className="font-black text-primary">Rs.{order.totalAmount?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={cn("px-4 py-1.5 rounded-full font-black text-[9px]", order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                          {order.status?.toUpperCase() || 'PENDING'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <Dialog>
                          <DialogTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl"><Info className="w-6 h-6" /></Button></DialogTrigger>
                          <DialogContent className="max-w-3xl rounded-[2.5rem] bg-white border-none p-0 overflow-hidden shadow-2xl">
                             <div className="bg-primary p-8 text-white"><DialogHeader><DialogTitle className="text-3xl font-black">ORDER LOGISTICS</DialogTitle></DialogHeader></div>
                             <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                               <div className="grid md:grid-cols-2 gap-10">
                                 <div className="space-y-6">
                                   <div className="space-y-4">
                                     <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Client Identity</h4>
                                     <div className="p-5 rounded-2xl bg-gray-50 space-y-2">
                                       <p className="font-black">{order.shippingDetails?.fullName}</p>
                                       <p className="text-xs font-bold text-primary">{order.shippingDetails?.contactNumber}</p>
                                       <p className="text-xs text-muted-foreground">{order.shippingDetails?.address}, {order.shippingDetails?.city}</p>
                                     </div>
                                   </div>
                                 </div>
                                 <div className="space-y-6">
                                   <div className="space-y-4">
                                      <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Artifacts</h4>
                                      <AdminOrderItemsList orderId={order.id} />
                                   </div>
                                 </div>
                               </div>
                               <Separator />
                               <div className="flex gap-4">
                                 <Button onClick={() => handleUpdateOrderStatus(order.id, 'shipped')} className="flex-1 rounded-xl h-14 font-black">MARK SHIPPED</Button>
                                 <Button onClick={() => handleUpdateOrderStatus(order.id, 'delivered')} variant="outline" className="flex-1 rounded-xl h-14 font-black">MARK DELIVERED</Button>
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

      {/* Product Management Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-5xl rounded-[3rem] border-none max-h-[90vh] overflow-y-auto p-0 bg-white shadow-3xl">
          <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 p-8">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black uppercase tracking-tight">
                {editingProduct ? 'Recalibrate Item' : 'New Artifact Drop'}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-10 space-y-12">
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Core Information</Label>
                  <Input placeholder="Item Name" value={productFormData.name} onChange={(e) => setProductFormData({...productFormData, name: e.target.value})} className="h-16 rounded-2xl text-lg font-black" />
                  <Select value={productFormData.category} onValueChange={(val) => setProductFormData({...productFormData, category: val})}>
                    <SelectTrigger className="h-16 rounded-2xl font-bold"><SelectValue placeholder="Assign Group" /></SelectTrigger>
                    <SelectContent className="bg-white">{categories?.map(cat => <SelectItem key={cat.id} value={cat.name} className="font-bold">{cat.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Textarea placeholder="Artifact Narrative/Description" value={productFormData.description} onChange={(e) => setProductFormData({...productFormData, description: e.target.value})} className="min-h-[150px] rounded-3xl p-6 text-sm font-medium leading-relaxed" />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Base Price</Label><Input type="number" value={productFormData.price} onChange={(e) => setProductFormData({...productFormData, price: e.target.value})} className="h-16 rounded-2xl font-black" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-primary tracking-widest">Drop Price</Label><Input type="number" value={productFormData.discountPrice} onChange={(e) => setProductFormData({...productFormData, discountPrice: e.target.value})} className="h-16 rounded-2xl font-black border-primary/20 bg-primary/5" /></div>
                </div>

                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Stock Level</Label><Input type="number" value={productFormData.inventory} onChange={(e) => setProductFormData({...productFormData, inventory: e.target.value})} className="h-16 rounded-2xl font-black" /></div>
              </div>

              <div className="space-y-10">
                <div className="space-y-6">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2"><Zap className="w-4 h-4" /> Primary Asset</Label>
                  <div className="relative aspect-video rounded-[2.5rem] overflow-hidden group cursor-pointer border-2 border-dashed border-gray-200 hover:border-primary transition-all flex flex-col items-center justify-center text-gray-400 bg-gray-50" onClick={() => fileInputRef.current?.click()}>
                    {productFormData.imageUrl ? <Image src={productFormData.imageUrl} alt="Main" fill className="object-cover" /> : isUploading ? <Loader2 className="w-12 h-12 animate-spin text-primary" /> : <ImagePlus className="w-12 h-12" />}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMainImageUpload} />
                </div>

                <div className="space-y-6">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2"><Images className="w-4 h-4" /> Artifact Gallery</Label>
                  <div className="grid grid-cols-4 gap-4">
                    {productFormData.images.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group">
                        <Image src={img} alt="Gallery" fill className="object-cover" />
                        <button onClick={() => removeGalleryImage(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={() => galleryInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:bg-primary/5 hover:border-primary transition-all text-gray-400">
                      <Plus className="w-6 h-6" />
                    </button>
                    <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" multiple onChange={handleGalleryUpload} />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid md:grid-cols-2 gap-12">
              {isApparel && (
                <div className="space-y-8 p-8 bg-primary/5 rounded-[2.5rem] animate-in slide-in-from-left-4">
                  <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Ruler className="w-5 h-5 text-primary" /> Apparel Config</h3>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-gray-500">Available Sizes (Comma Separated)</Label>
                    <Input placeholder="S, M, L, XL" value={productFormData.sizes} onChange={(e) => setProductFormData({...productFormData, sizes: e.target.value})} className="h-16 rounded-2xl font-bold bg-white" />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-gray-500">Size Chart Artifact</Label>
                    <div className="relative h-40 rounded-2xl border-2 border-dashed border-primary/20 flex items-center justify-center bg-white cursor-pointer group" onClick={() => sizeChartInputRef.current?.click()}>
                      {productFormData.sizeChartUrl ? <Image src={productFormData.sizeChartUrl} alt="Size Chart" fill className="object-contain" /> : <ImagePlus className="w-8 h-8 text-primary/30 group-hover:text-primary transition-colors" />}
                    </div>
                    <input type="file" ref={sizeChartInputRef} className="hidden" accept="image/*" onChange={handleSizeChartUpload} />
                  </div>
                </div>
              )}

              <div className="space-y-8 p-8 bg-secondary/5 rounded-[2.5rem]">
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Settings2 className="w-5 h-5 text-secondary" /> Artifact Specs</h3>
                <div className="space-y-4">
                  {productFormData.specifications.map((spec, i) => (
                    <div key={i} className="flex gap-2">
                      <Input placeholder="Key (e.g. Weight)" value={spec.key} onChange={(e) => updateSpecification(i, 'key', e.target.value)} className="h-12 rounded-xl bg-white" />
                      <Input placeholder="Value (e.g. 200g)" value={spec.value} onChange={(e) => updateSpecification(i, 'value', e.target.value)} className="h-12 rounded-xl bg-white" />
                      <Button variant="ghost" size="icon" onClick={() => removeSpecification(i)}><X className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addSpecification} className="w-full h-12 rounded-xl border-dashed border-secondary/40 text-secondary font-black">ADD TECHNICAL SPEC</Button>
                </div>
              </div>
            </div>

            <div className="pt-10 border-t border-gray-100 flex flex-col sm:flex-row gap-4 sticky bottom-0 bg-white p-4">
              <Button variant="ghost" onClick={() => setIsProductDialogOpen(false)} className="rounded-2xl h-16 px-10 font-bold flex-1">CANCEL</Button>
              <Button onClick={handleSaveProduct} className="rounded-2xl h-16 px-20 font-black bg-primary flex-[2] text-white shadow-2xl shadow-primary/20">
                {editingProduct ? 'RECALIBRATE DROP' : 'INITIATE DROP'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
