import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {AppSidebar} from "./_components/AppSidebar";

function DashboardProvider({children}){
    return (
        <SidebarProvider>
            <AppSidebar />
            <div className="w-full min-h-screen px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
                <div className="mx-auto w-full max-w-[1500px] space-y-6 lg:space-y-8">
                    {/* <SidebarTrigger /> */}
                    {children}
                </div>
            </div>
        </SidebarProvider>
    )
}

export default DashboardProvider