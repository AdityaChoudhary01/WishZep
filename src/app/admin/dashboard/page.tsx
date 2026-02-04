"use client";

import { useState, useRef } from 'react';
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
  Trash2
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
import { collection, addDoc, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('products');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    discountPrice: 0,
    category: 'Footwear',
    description: '',
    inventory: 10,
    imageUrl: '',
    attributes: ''
  });

  const [editingProduct, setEditingProduct] = useState<any>(null);

  const adminRoleRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'roles_admin', user.uid);
  }, [db, user]);

  const { data: adminRole, isLoading: adminLoading } = useDoc(adminRoleRef);
  const isUserAdmin = !!adminRole;

  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      if (isEdit) {
        setEditingProduct((prev: any) => ({ ...prev, imageUrl: url }));
      } else {
        setNewProduct(prev => ({ ...prev, imageUrl: url }));
      }
      toast({ title: "Image Uploaded! 📸", description: "Product preview updated." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddProduct = () => {
    if (!db || !isUserAdmin) return;
    if (!newProduct.imageUrl) {
      toast({ variant: "destructive", title: "Missing Image", description: "Please upload a product image." });
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
    setNewProduct({ name: '', price: 0, discountPrice: 0, category: 'Footwear', description: '', inventory: 10, imageUrl: '', attributes: '' });
  };

  const handleOpenEdit = (product: any) => {
    setEditingProduct(product);
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
    if (confirm("Are you sure you want to remove this product from the vault?")) {
      deleteDocumentNonBlocking(doc(db, 'products', productId));
      toast({ title: "Product Removed", description: "Item has been purged from inventory." });
    }
  };

  const claimAdminRole = async () => {
    if (!db || !user) return;
    try {
      await setDoc(doc(db, 'roles_admin', user.uid), {
        uid: user.uid,
        email: user.email,
        assignedAt: serverTimestamp()
      });
      toast({ title: "Admin Access Granted! 🛡️", description: "You now have permissions to manage products." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Permission Denied", description: "Could not claim admin role." });
    }
  };

  const seedSampleData = async () => {
    if (!db || !isUserAdmin) return;
    const samples = [
      { name: 'Neo-Stomp Tech Sneakers', price: 2199, discountPrice: 1099, imageUrl: 'https://picsum.photos/seed/wishzep-p1/800/800', category: 'Footwear', description: 'High-performance techwear sneakers.', inventory: 45, attributes: 'Lightweight, Breathable', createdAt: serverTimestamp() },
      { name: 'SonicWave Elite Pro', price: 2499, discountPrice: 1999, imageUrl: 'https://picsum.photos/seed/wishzep-p2/800/800', category: 'Audio', description: 'Noise-canceling headphones.', inventory: 12, attributes: '40h Battery, Bluetooth 5.3', createdAt: serverTimestamp() }
    ];
    samples.forEach(p => addDocumentNonBlocking(collection(db, 'products'), p));
    toast({ title: "Seeding Success! ✨" });
  };

  if (isUserLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-xs">Verifying Credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background pt-0">
      <aside className="w-64 glass border-r border-white/20 p-6 hidden md:block">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><span className="text-white font-bold text-xl">W</span></div>
          <span className="text-xl font-bold font-headline wishzep-text">Admin</span>
        </div>
        <nav className="space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl"><LayoutDashboard className="w-5 h-5" /> Dashboard</Button>
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl bg-primary/10 text-primary"><Package className="w-5 h-5" /> Products</Button>
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl" onClick={seedSampleData} disabled={!isUserAdmin}><Database className="w-5 h-5" /> Seed Demo Data</Button>
          {!isUserAdmin && <Button onClick={claimAdminRole} className="w-full justify-start gap-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white mb-4"><ShieldCheck className="w-5 h-5" /> Claim Admin Status</Button>}
        </nav>
      </aside>

      <main className="flex-1 p-8 space-y-8">
        {!isUserAdmin && (
          <Alert variant="destructive" className="rounded-3xl border-2 border-destructive/20 bg-destructive/5 glass mb-8">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-black uppercase tracking-tighter">Access Restricted</AlertTitle>
            <AlertDescription className="text-sm opacity-80">
              You are currently in read-only mode. To manage products, please click the <strong>Claim Admin Status</strong> button in the sidebar.
            </AlertDescription>
          </Alert>
        )}

        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black">Manage <span className="wishzep-text">Inventory</span></h1>
            <p className="text-muted-foreground text-sm">Real-time control over your product catalogue.</p>
          </div>
          <div className="flex gap-4">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!isUserAdmin} className="rounded-2xl h-12 px-6 gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                  <Plus className="w-5 h-5" /> Add New Product
                </Button>
              </DialogTrigger>
              <DialogContent className="glass max-w-md overflow-y-auto max-h-[90vh]">
                <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-full aspect-square bg-muted rounded-2xl overflow-hidden border-2 border-dashed border-white/40 flex items-center justify-center">
                      {newProduct.imageUrl ? (
                        <Image src={newProduct.imageUrl} alt="Preview" fill className="object-cover" />
                      ) : (
                        <div className="text-center p-6">
                          <Camera className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground font-bold uppercase">Product Preview</p>
                        </div>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-10 h-10 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full rounded-xl glass border-white/40"
                    >
                      {newProduct.imageUrl ? 'Change Image' : 'Upload Image'}
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, false)} 
                    />
                  </div>

                  <div className="grid gap-2"><Label>Name</Label><Input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Original Price (Rs.)</Label><Input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} /></div>
                    <div className="grid gap-2"><Label>Discount Price (Rs.)</Label><Input type="number" value={newProduct.discountPrice} onChange={e => setNewProduct({...newProduct, discountPrice: Number(e.target.value)})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Stock</Label><Input type="number" value={newProduct.inventory} onChange={e => setNewProduct({...newProduct, inventory: Number(e.target.value)})} /></div>
                    <div className="grid gap-2"><Label>Category</Label><Input value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} /></div>
                  </div>
                  <div className="grid gap-2"><Label>Attributes</Label><Input value={newProduct.attributes} onChange={e => setNewProduct({...newProduct, attributes: e.target.value})} placeholder="e.g. Slim Fit, Cotton" /></div>
                  <div className="grid gap-2"><Label>Description</Label><Textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} /></div>
                  <Button onClick={handleAddProduct} disabled={isUploading} className="w-full h-12 rounded-xl bg-primary">Create Product</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="glass max-w-md overflow-y-auto max-h-[90vh]">
            <DialogHeader><DialogTitle>Edit Product: {editingProduct?.name}</DialogTitle></DialogHeader>
            {editingProduct && (
              <div className="space-y-4 pt-4">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-full aspect-square bg-muted rounded-2xl overflow-hidden border-2 border-dashed border-white/40 flex items-center justify-center">
                    <Image src={editingProduct.imageUrl || `https://picsum.photos/seed/${editingProduct.id}/800/800`} alt="Preview" fill className="object-cover" />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full rounded-xl glass border-white/40"
                  >
                    Change Image
                  </Button>
                  <input 
                    type="file" 
                    ref={editFileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, true)} 
                  />
                </div>

                <div className="grid gap-2"><Label>Name</Label><Input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>Original Price (Rs.)</Label><Input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} /></div>
                  <div className="grid gap-2"><Label>Discount Price (Rs.)</Label><Input type="number" value={editingProduct.discountPrice} onChange={e => setEditingProduct({...editingProduct, discountPrice: Number(e.target.value)})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>Stock</Label><Input type="number" value={editingProduct.inventory} onChange={e => setEditingProduct({...editingProduct, inventory: Number(e.target.value)})} /></div>
                  <div className="grid gap-2"><Label>Category</Label><Input value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} /></div>
                </div>
                <div className="grid gap-2"><Label>Attributes</Label><Input value={editingProduct.attributes} onChange={e => setEditingProduct({...editingProduct, attributes: e.target.value})} placeholder="e.g. Slim Fit, Cotton" /></div>
                <div className="grid gap-2"><Label>Description</Label><Textarea value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} /></div>
                <Button onClick={handleSaveEdit} disabled={isUploading} className="w-full h-12 rounded-xl bg-primary">Save Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total SKU', value: products?.length || 0, icon: Package, color: 'text-primary' },
            { label: 'Admin Status', value: isUserAdmin ? 'Authorized' : 'Locked', icon: ShieldCheck, color: isUserAdmin ? 'text-green-500' : 'text-red-500' },
            { label: 'DB Status', value: 'Live', icon: Database, color: 'text-secondary' },
          ].map((stat, i) => (
            <div key={i} className="glass p-6 rounded-3xl space-y-4">
              <div className="flex justify-between"><p className="text-sm font-bold uppercase text-muted-foreground">{stat.label}</p><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
              <p className="text-3xl font-black">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="glass rounded-[2rem] overflow-hidden">
          <Table>
            <TableHeader className="bg-white/30">
              <TableRow><TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead>Stock</TableHead><TableHead>Price</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {productsLoading ? [...Array(3)].map((_, i) => (
                <TableRow key={i}><TableCell><Skeleton className="h-10 w-40" /></TableCell><TableCell><Skeleton className="h-6 w-20" /></TableCell><TableCell><Skeleton className="h-6 w-16" /></TableCell><TableCell><Skeleton className="h-6 w-16" /></TableCell><TableCell className="text-right"><Skeleton className="h-10 w-10 rounded-full ml-auto" /></TableCell></TableRow>
              )) : products?.map((p) => (
                <TableRow key={p.id} className="hover:bg-white/20 border-white/10 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden relative">
                        <Image src={p.imageUrl || `https://picsum.photos/seed/${p.id}/100/100`} alt={p.name} fill className="object-cover" />
                      </div>
                      {p.name}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                  <TableCell>{p.inventory} units</TableCell>
                  <TableCell className="font-bold">
                    {p.discountPrice && p.discountPrice > 0 ? (
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground line-through">Rs.{p.price}</span>
                        <span>Rs.{p.discountPrice}</span>
                      </div>
                    ) : (
                      <span>Rs.{p.price}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass">
                        <DropdownMenuItem onClick={() => handleOpenEdit(p)} className="gap-2 cursor-pointer">
                          <Edit2 className="w-4 h-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteProduct(p.id)} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4" /> Delete Product
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
