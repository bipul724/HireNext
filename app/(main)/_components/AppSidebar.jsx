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
import Image from "next/image"
// import Logo from "@/public/Logo.png"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function AppSidebar() {

  const path = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className={"flex items-center justify-center mt-2"}>
        <Image
          src="/logo.png"
          alt="Logo"
          width={200}
          height={100}
          className="w-[180px]"
        />
        <Button className="w-full mt-5">
          <Plus />Create New Interview
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarContent>
            <SidebarMenu>
              {SideBarOptions.map((option, index) => (
                <SidebarMenuItem key={index} className={"p-1"}>
                  <SidebarMenuButton asChild className={`p-5 ${path == option.path ? "bg-blue-100" : ""}`}>
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