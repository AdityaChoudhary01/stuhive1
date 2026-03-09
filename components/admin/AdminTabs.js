"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import UserManagementTable from "./UsersManagementTable";
import NoteModerationTable from "./NoteModerationTable";
import BlogModerationTable from "./BlogModerationTable";
import AdminAnalyticsClient from "./AdminAnalyticsClient"; 
import OpportunityManagementTable from "./OpportunityManagementTable"; 
import PayoutManagementTable from "./PayoutManagementTable"; 
import UniversityManager from "./UniversityManager"; 
import ReportModerationTable from "./ReportModerationTable"; 
import TransactionManagementTable from "./TransactionManagementTable"; // 🚀 IMPORTED NEW COMPONENT
import { 
  FaUsers, 
  FaFileAlt, 
  FaPenNib, 
  FaChartLine, 
  FaBriefcase, 
  FaMoneyBillWave, 
  FaUniversity,
  FaShieldAlt,
  FaReceipt // 🚀 ADDED RECEIPT ICON
} from "react-icons/fa";

export default function AdminTabs({ users, notes, blogs, analyticsData, opportunities, pendingPayouts, reports, financialData }) {
  return (
    <Tabs defaultValue="analytics" className="w-full">
      {/* 🚀 Changed to 'flex flex-wrap' to handle 9 tabs gracefully on all screen sizes */}
      <TabsList className="flex flex-wrap w-full mb-8 h-auto bg-secondary/20 p-1 gap-1 justify-start">
        <TabsTrigger value="analytics" className="flex-1 min-w-[120px] gap-2 data-[state=active]:bg-background py-2">
          <FaChartLine /> Analytics
        </TabsTrigger>
        <TabsTrigger value="transactions" className="flex-1 min-w-[120px] gap-2 data-[state=active]:bg-background py-2 text-emerald-400">
          <FaReceipt /> Finances
        </TabsTrigger>
        <TabsTrigger value="users" className="flex-1 min-w-[120px] gap-2 data-[state=active]:bg-background py-2">
          <FaUsers /> Users
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex-1 min-w-[120px] gap-2 data-[state=active]:bg-background py-2">
          <FaFileAlt /> Notes
        </TabsTrigger>
        <TabsTrigger value="reports" className="flex-1 min-w-[120px] gap-2 data-[state=active]:bg-red-500/20 data-[state=active]:text-red-500 py-2">
          <FaShieldAlt /> Reports
        </TabsTrigger>
        <TabsTrigger value="blogs" className="flex-1 min-w-[120px] gap-2 data-[state=active]:bg-background py-2">
          <FaPenNib /> Blogs
        </TabsTrigger>
        <TabsTrigger value="opportunities" className="flex-1 min-w-[120px] gap-2 data-[state=active]:bg-background py-2">
          <FaBriefcase /> Exam/Jobs
        </TabsTrigger>
        <TabsTrigger value="payouts" className="flex-1 min-w-[120px] gap-2 data-[state=active]:bg-background py-2">
          <FaMoneyBillWave /> Payouts
        </TabsTrigger>
        <TabsTrigger value="universities" className="flex-1 min-w-[120px] gap-2 data-[state=active]:bg-background py-2">
          <FaUniversity /> Universities
        </TabsTrigger>
      </TabsList>

      <TabsContent value="analytics" className="mt-0">
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            {analyticsData ? (
              <AdminAnalyticsClient data={analyticsData} />
            ) : (
              <div className="p-10 text-center text-gray-500">Analytics data is loading or unavailable.</div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 🚀 NEW TAB CONTENT FOR TRANSACTIONS */}
      <TabsContent value="transactions" className="mt-0">
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                Global <span className="text-emerald-500">Finances</span>
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Track platform revenue, creator payouts, and individual transactions.
              </p>
            </div>
            <TransactionManagementTable financialData={financialData} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="users" className="mt-0">
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <UserManagementTable initialUsers={users} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="notes" className="mt-0">
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <NoteModerationTable initialNotes={notes} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reports" className="mt-0">
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                Fraud & <span className="text-red-500">Quality Control</span>
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Investigate reports regarding bait-and-switch content, plagiarism, or poor quality files.
              </p>
            </div>
            <ReportModerationTable reports={reports} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="blogs" className="mt-0">
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <BlogModerationTable initialBlogs={blogs} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="opportunities" className="mt-0">
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <OpportunityManagementTable initialData={opportunities || []} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payouts" className="mt-0">
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Pending Payouts</h2>
                <p className="text-muted-foreground text-sm mt-1">Creators whose wallet balance is ≥ ₹500.</p>
              </div>
            </div>
            <PayoutManagementTable initialPayouts={pendingPayouts} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="universities" className="mt-0">
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                University <span className="text-cyan-400">Management</span>
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Professionalize university hub pages with custom logos, cover images, and SEO metadata.
              </p>
            </div>
            <UniversityManager />
          </CardContent>
        </Card>
      </TabsContent>

    </Tabs>
  );
}