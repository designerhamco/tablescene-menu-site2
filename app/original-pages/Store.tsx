import React from 'react';
import PageHeader from '../components/layout/PageHeader';
import { motion } from 'motion/react';
import { ShoppingBag } from 'lucide-react';

const products = [
  {
    id: 1,
    name: "Premium Table Stand",
    price: "₩45,000",
    image: "https://images.unsplash.com/photo-1595079676339-1534827d8c11?q=80&w=1000&auto=format&fit=crop",
    category: "Hardware"
  },
  {
    id: 2,
    name: "Signature Menu Design",
    price: "₩150,000",
    image: "https://images.unsplash.com/photo-1541533848490-bc9c30af3691?q=80&w=1000&auto=format&fit=crop",
    category: "Design"
  },
  {
    id: 3,
    name: "NFC Order Tag",
    price: "₩12,000",
    image: "https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=1000&auto=format&fit=crop",
    category: "Accessories"
  },
  {
    id: 4,
    name: "Staff Smart Watch",
    price: "₩89,000",
    image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=80&w=1000&auto=format&fit=crop",
    category: "Device"
  }
];

const Store = () => {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader 
        title="스토어" 
        subtitle="Purchase & Subscription"
        bgImage="https://images.unsplash.com/photo-1472851294608-415522f96485?q=80&w=2070&auto=format&fit=crop"
      />
      
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group cursor-pointer"
            >
              <div className="aspect-square rounded-xl overflow-hidden shadow-lg mb-4 relative bg-zinc-100">
                <img 
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <button className="absolute bottom-4 right-4 p-3 bg-black text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <ShoppingBag size={20} />
                </button>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">{product.category}</span>
                  <h3 className="text-lg font-bold text-zinc-900 mt-1 group-hover:text-black transition-colors">{product.name}</h3>
                </div>
                <span className="text-lg font-semibold text-zinc-900">{product.price}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Store;
