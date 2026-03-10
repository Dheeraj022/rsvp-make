"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  UserCheck,
  Hotel,
  BarChart3,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  Users
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-50 pointer-events-none" />
      <div className="absolute top-[10%] -left-[5%] w-[30%] h-[30%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] -right-[5%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Calendar size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              RSVP<span className="text-primary font-black">INVITE</span>
            </span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8"
          >
            <UserCheck size={14} />
            <span>Trusted by leading event planners</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-foreground mb-8 leading-[1.1] tracking-tight"
          >
            Master Your Events <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              with Precision.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12"
          >
            A premium ecosystem designed for seamless RSVP tracking, hotel coordination,
            and real-time event management. Elegant. Efficient. Effortless.
          </motion.p>
        </div>
      </section>

      {/* Entry Roles Cards */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Administrators",
              desc: "Full control over event settings, coordinators, and master lists.",
              icon: ShieldCheck,
              link: "/admin",
              color: "from-zinc-900 to-zinc-700",
              btnText: "Admin Dashboard"
            },
            {
              title: "Hotel Partners",
              desc: "Manage guest allocations and room assignments with ease.",
              icon: Hotel,
              link: "/hotel/login",
              color: "from-primary to-blue-600",
              btnText: "Hotel Portal"
            },
            {
              title: "Coordinators",
              desc: "Real-time RSVP tracking and guest interaction management.",
              icon: UserCheck,
              link: "/coordinator/login",
              color: "from-zinc-100 to-white",
              btnText: "Coordinator Login",
              dark: false
            }
          ].map((role, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative p-8 rounded-3xl glass-card hover:border-primary/30 transition-all duration-500 overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${role.color} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900/5 dark:bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <role.icon className="text-foreground" size={28} />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">{role.title}</h3>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  {role.desc}
                </p>
                <Link href={role.link}>
                  <Button className="w-full group/btn rounded-xl h-12 shadow-md">
                    {role.btnText}
                    <ArrowRight size={16} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Stats */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center">
            {[
              { icon: Users, label: "Guest Management", value: "Unlimited" },
              { icon: BarChart3, label: "Real-time Reports", value: "Instant" },
              { icon: Smartphone, label: "Mobile Optimized", value: "Seamless" },
              { icon: ShieldCheck, label: "Secure Access", value: "Premium" }
            ].map((stat, i) => (
              <div key={i} className="space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                  <stat.icon size={24} />
                </div>
                <h4 className="text-3xl font-black text-foreground">{stat.value}</h4>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 bg-zinc-950 text-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-2 grayscale brightness-200">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-900">
              <Calendar size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight">
              RSVP<span className="font-black">INVITE</span>
            </span>
          </div>

          <div className="flex gap-8 text-sm text-zinc-400 font-medium">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Support</Link>
          </div>

          <p className="text-zinc-500 text-sm">
            © 2026 RSVP INVITE. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
