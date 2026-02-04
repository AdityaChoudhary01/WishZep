
"use client";

import { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Settings, 
  ShieldCheck, 
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
  RefreshCcw,
  Menu,
  Tags,
  X
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
import Image from 'next/image';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, setDoc, updateDoc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
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
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('products');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirmedAdmin, setIsConfirmedAdmin] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

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
      timer = setTimeout(() => {
        setIsConfirmedAdmin(true);
      }, 1000);
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
    if (!db || !isConfirmedAdmin || activeTab !== 'orders') return null;
    return query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
  }, [db, isConfirmedAdmin, activeTab]);
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useCollection(ordersQuery, true);

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

  const handleAddCategory = async () => {
    if (!db || !newCategory.trim()) return;
    const catId = newCategory.toLowerCase().replace(/\s+/g, '-');
    await setDoc(doc(db, 'categories', catId), {
      id: catId,
      name: newCategory.trim(),
      createdAt: new Date().toISOString()
    });
    setNewCategory('');
    toast({ title: "Category Added! ✨" });
  };

  const handleUpdateOrderStatus = (order: any, newStatus: string) => {
    if (!db || !isUserAdmin) return;
    updateDocumentNonBlocking(doc(db, 'orders', order.id), {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    toast({ title: "Status Updated", description: `Order #${order.id.slice(0, 8)} is now ${newStatus}.` });
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
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 mb-2">Management Vault</p>
        {[
          { id: 'products', label: 'Inventory', icon: Package },
          { id: 'categories', label: 'Categories', icon: Tags },
          { id: 'orders', label: 'Orders', icon: ShoppingBag },
        ].map((link) => (
          <Button 
            key={link.id}
            variant={activeTab === link.id ? 'default' : 'ghost'} 
            onClick={() => {
              setActiveTab(link.id);
              setIsMobileMenuOpen(false);
            }}
            className={cn("w-full justify-start gap-3 rounded-xl h-12 transition-all", activeTab === link.id ? "shadow-lg shadow-primary/20" : "")}
          >
            <link.icon className="w-5 h-5" /> {link.label}
          </Button>
        ))}
      </div>
      {!isUserAdmin && (
        <div className="pt-4 px-2">
          <Button onClick={claimAdminRole} className="w-full justify-start gap-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white h-12">
            <ShieldCheck className="w-5 h-5" /> Claim Admin Access
          </Button>
        </div>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="w-64 glass border-r border-white/20 p-6 hidden md:block h-screen sticky top-0">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center rotate-12"><span className="text-white font-black text-2xl">W</span></div>
          <span className="text-xl font-bold wishzep-text tracking-tighter">Admin</span>
        </div>
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden glass border-b border-white/20 p-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center rotate-6"><span className="text-white font-black text-lg">W</span></div>
          <span className="text-lg font-bold wishzep-text tracking-tighter">Admin</span>
        </div>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-xl"><Menu className="w-6 h-6" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="glass w-72 p-6 border-white/20">
            <SheetHeader className="mb-8">
              <SheetTitle className="text-2xl font-black wishzep-text text-left">Admin Panel</SheetTitle>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </header>

      <main className="flex-1 p-4 md:p-8 space-y-8 overflow-x-hidden">
        {!isUserAdmin && !adminLoading && (
          <Alert variant="destructive" className="rounded-3xl border-destructive/20 bg-destructive/5 animate-in fade-in zoom-in duration-500">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>This dialogue is reserved for verified WishZep Architects. Please claim access to proceed.</AlertDescription>
          </Alert>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-black">Manage <span className="wishzep-text">Vault</span></h1>
                <p className="text-muted-foreground text-xs md:text-sm">Control your high-performance catalogue.</p>
              </div>
            </header>

            <div className="glass rounded-[2rem] overflow-hidden border border-white/20 shadow-2xl">
              <div className="overflow-x-auto">
                <Table className="min-w-[600px] md:min-w-full">
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
                            <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden relative border border-white/20">
                              <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                            </div>
                            <span className="truncate max-w-[200px] text-xs md:text-sm">{p.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="glass px-2 text-[10px]">{p.category}</Badge></TableCell>
                        <TableCell className="font-medium text-muted-foreground text-xs">{p.inventory} units</TableCell>
                        <TableCell className="font-black text-primary text-xs md:text-sm">Rs.{p.discountPrice || p.price}</TableCell>
                        <TableCell className="text-right px-6">
                           <Button variant="ghost" size="icon" className="rounded-xl"><Edit2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <header>
              <h1 className="text-3xl md:text-4xl font-black">Tag <span className="wishzep-text">Registry</span></h1>
              <p className="text-muted-foreground text-xs md:text-sm">Organize your frequency channels.</p>
            </header>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-1 space-y-6">
                <div className="glass p-8 rounded-[2rem] space-y-4">
                  <h3 className="text-xl font-black">Register New</h3>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Channel Name</Label>
                    <Input 
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="e.g. Hyperwear" 
                      className="glass h-12 rounded-xl bg-white/30"
                    />
                  </div>
                  <Button onClick={handleAddCategory} disabled={!newCategory} className="w-full rounded-xl h-12 bg-primary font-bold">Register Category</Button>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="glass rounded-[2rem] overflow-hidden border border-white/20">
                  <Table>
                    <TableHeader className="bg-white/30">
                      <TableRow>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest px-6">Category</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Slug</TableHead>
                        <TableHead className="text-right font-black uppercase text-[10px] tracking-widest px-6">Delete</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoriesLoading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell className="px-6"><Skeleton className="h-6 w-32" /></TableCell><TableCell><Skeleton className="h-6 w-32" /></TableCell><TableCell className="text-right px-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell></TableRow>) :
                      categories?.map((cat) => (
                        <TableRow key={cat.id} className="hover:bg-white/10 transition-colors h-16">
                          <TableCell className="px-6 font-bold">{cat.name}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{cat.id}</TableCell>
                          <TableCell className="text-right px-6">
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => deleteDoc(doc(db!, 'categories', cat.id))}>
                              <Trash2 className="w-4 h-4" />
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
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <header>
              <h1 className="text-3xl md:text-4xl font-black">Order <span className="wishzep-text">Command</span></h1>
              <p className="text-muted-foreground text-xs md:text-sm">Fulfill the vision. Manage customer drops.</p>
            </header>

            <div className="glass rounded-[2rem] overflow-hidden border border-white/20 shadow-2xl">
              <div className="overflow-x-auto">
                <Table className="min-w-[700px] md:min-w-full">
                  <TableHeader className="bg-white/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6">ID</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Amount</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px] tracking-widest px-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersLoading || !isConfirmedAdmin ? (
                      [...Array(5)].map((_, i) => <TableRow key={i}><TableCell className="px-6"><Skeleton className="h-6 w-32" /></TableCell><TableCell><Skeleton className="h-6 w-24" /></TableCell><TableCell><Skeleton className="h-6 w-20" /></TableCell><TableCell><Skeleton className="h-6 w-24" /></TableCell><TableCell className="text-right px-6"><Skeleton className="h-10 w-10 ml-auto rounded-full" /></TableCell></TableRow>)
                    ) : orders?.map((order) => (
                      <TableRow key={order.id} className="hover:bg-white/10 transition-colors border-white/10 h-20">
                        <TableCell className="px-6 font-bold font-mono text-[10px]">#{order.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-black text-primary text-xs">Rs.{order.totalAmount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "px-3 py-1 rounded-full text-[9px] uppercase font-black",
                            order.status === 'delivered' ? 'bg-green-500/20 text-green-500' : 
                            order.status === 'shipped' ? 'bg-blue-500/20 text-blue-500' : 'bg-yellow-500/20 text-yellow-500'
                          )}>
                            {order.status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/20"><Settings className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass min-w-[160px] rounded-xl border-white/20">
                              <DropdownMenuItem onClick={() => handleUpdateOrderStatus(order, 'pending')} className="gap-2 cursor-pointer font-bold text-yellow-500"><Clock className="w-4 h-4" /> Mark Pending</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateOrderStatus(order, 'shipped')} className="gap-2 cursor-pointer font-bold text-blue-500"><Truck className="w-4 h-4" /> Mark Shipped</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateOrderStatus(order, 'delivered')} className="gap-2 cursor-pointer font-bold text-green-500"><CheckCircle2 className="w-4 h-4" /> Mark Delivered</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!ordersLoading && isConfirmedAdmin && orders?.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="py-20 text-center glass rounded-2xl"><ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" /><p className="font-bold text-muted-foreground">No orders in vault.</p></TableCell></TableRow>
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
