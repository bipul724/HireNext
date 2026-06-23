"use client"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SideBarOptions } from "@/services/Constants"
import { Plus } from "lucide-react"
// import Image from "next/image"
import Logo from "@/components/Logo"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function AppSidebar() {

  const path = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className={"mt-2 px-4"}>
        <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
          <Logo size="md" />
        </Link>
        <Link href="/dashboard/create-interview">
          <Button className="w-full mt-5">
            <Plus />Create New Interview
          </Button>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarContent>
            <SidebarMenu>
              {SideBarOptions.map((option, index) => (
                <SidebarMenuItem key={index} className={"p-1"}>
                  <SidebarMenuButton asChild className={`p-5 ${path == option.path ? "bg-teal-50" : ""}`}>
                    <Link href={option.path}>
                      <option.icon className={`${path == option.path ? "text-primary" : ""}`} />
                      <span className={`text-[16px]font-medium ${path == option.path ? "text-primary" : ""}`}>{option.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}