"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import UserManagementTable from "./UsersManagementTable";
import NoteModerationTable from "./NoteModerationTable";
import BlogModerationTable from "./BlogModerationTable";
import AdminAnalyticsClient from "./AdminAnalyticsClient"; 
import OpportunityManagementTable from "./OpportunityManagementTable"; // 🚀 ADDED: Import new Sarkari table
import { FaUsers, FaFileAlt, FaPenNib, FaChartLine, FaBriefcase } from "react-icons/fa"; // 🚀 ADDED: FaBriefcase

// 🚀 ADDED: opportunities prop
export default function AdminTabs({ users, notes, blogs, analyticsData, opportunities }) {
  return (
    <Tabs defaultValue="analytics" className="w-full">
      {/* 🚀 FIXED: Changed md:grid-cols-4 to md:grid-cols-5 to fit the new tab */}
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-8 h-auto md:h-12 bg-secondary/20 p-1 gap-1">
        <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-background py-2 md:py-1">
          <FaChartLine /> Analytics
        </TabsTrigger>
        <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-background py-2 md:py-1">
          <FaUsers /> Users
        </TabsTrigger>
        <TabsTrigger value="notes" className="gap-2 data-[state=active]:bg-background py-2 md:py-1">
          <FaFileAlt /> Notes
        </TabsTrigger>
        <TabsTrigger value="blogs" className="gap-2 data-[state=active]:bg-background py-2 md:py-1">
          <FaPenNib /> Blogs
        </TabsTrigger>
        {/* 🚀 ADDED: New Exam/Jobs Tab Trigger */}
        <TabsTrigger value="opportunities" className="gap-2 data-[state=active]:bg-background py-2 md:py-1">
          <FaBriefcase /> Exam/Jobs
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

      <TabsContent value="blogs" className="mt-0">
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <BlogModerationTable initialBlogs={blogs} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* 🚀 ADDED: New Exam/Jobs Tab Content */}
      <TabsContent value="opportunities" className="mt-0">
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <OpportunityManagementTable initialData={opportunities || []} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}