"use client"

import * as React from "react"
import {
  ArrowUpCircle,
  BarChart3,
  Camera,
  ClipboardList,
  Database,
  FileCode,
  File,
  FileText,
  Folder,
  HelpCircle,
  LayoutDashboard,
  List,
  Search,
  Settings,
  Users,
  Image,
  Lightbulb,
} from "lucide-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "AI Agent",
    email: "ai@presentation.com",
    avatar: "/avatars/ai-agent.jpg",
  },
  navMain: [
    {
      title: "エージェント",
      url: "/",
      icon: List,
    },
    {
      title: "ツール一覧",
      url: "/tools",
      icon: ClipboardList,
    },
    {
      title: "メディア一覧",
      url: "/media",
      icon: Image,
    },
  ],
  navSecondary: [
    {
      title: "設定",
      url: "#",
      icon: Settings,
    },
    {
      title: "ヘルプ",
      url: "#",
      icon: HelpCircle,
    },
    {
      title: "検索",
      url: "#",
      icon: Search,
    },
  ],
  documents: [
    {
      name: "ドキュメント",
      url: "#",
      icon: File,
    },
    {
      name: "ユースケース一覧",
      url: "/usecases",
      icon: Lightbulb,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/">
                <ArrowUpCircle className="h-5 w-5" />
                <span className="text-base font-semibold">Open-SuperAgent</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
} 