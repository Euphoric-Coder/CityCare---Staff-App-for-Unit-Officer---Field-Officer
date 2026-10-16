import React from "react";
import { View, Text, TouchableOpacity, ScrollView, useColorScheme, ActivityIndicator, StyleSheet, Dimensions } from "react-native";
import { ShieldAlert, Bell, MessageSquare, CheckCircle, Clock3, Lock } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';

export interface RestrictedOfficerDashboardProps {
  officerName: string;
  city?: string;
  department?: string;
  role: "unit_officer" | "field_officer";
  unreadNotificationCount: number;
  onNotificationPress: () => void;
  onMessagesPress: () => void;
}

const { width } = Dimensions.get('window');

export function RestrictedOfficerDashboard({
  officerName,
  city,
  department,
  role,
  unreadNotificationCount,
  onNotificationPress,
  onMessagesPress,
}: RestrictedOfficerDashboardProps) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: isDark ? "#020617" : "#F8FAFC" }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 80 }}>
      {/* Dynamic Header */}
      <LinearGradient
        colors={isDark ? ['#0F172A', '#1E293B'] : ['#0891B2', '#0D9488']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 20,
          paddingBottom: 40,
          paddingHorizontal: 24,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: isDark ? "#94A3B8" : "rgba(255,255,255,0.8)", fontWeight: "700", textTransform: 'uppercase', letterSpacing: 1 }}>
              CityCare {role === 'unit_officer' ? 'Unit' : 'Field'} Officer
            </Text>
            <Text style={{ fontSize: 26, color: isDark ? "#F1F5F9" : "#FFFFFF", fontWeight: "800", marginTop: 4, letterSpacing: -0.5 }}>
              Good evening,
            </Text>
            <Text style={{ fontSize: 26, color: isDark ? "#38BDF8" : "#CCFBF1", fontWeight: "800", letterSpacing: -0.5 }}>
              {officerName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <View style={{ backgroundColor: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ fontSize: 12, color: isDark ? "#38BDF8" : "#FFFFFF", fontWeight: "600" }}>
                  {department ? `${department} • ` : ""}{city || "CityCare"}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={onNotificationPress} style={{ padding: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.2)', borderRadius: 20, position: "relative" }}>
            <Bell size={24} color={isDark ? "#E2E8F0" : "#FFFFFF"} />
            {unreadNotificationCount > 0 && (
              <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "#EF4444", width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: isDark ? "#0F172A" : "#0D9488" }} />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Main Content Area */}
      <View style={{ paddingHorizontal: 24, marginTop: -20, flexGrow: 1 }}>
        
        {/* Status Card */}
        <View style={{ 
          backgroundColor: isDark ? "#0F172A" : "#FFFFFF", 
          borderRadius: 24, 
          padding: 32, 
          alignItems: 'center',
          shadowColor: isDark ? '#000' : '#64748B',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 24,
          elevation: 5,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
        }}>
          
          <View style={{ position: 'relative', marginBottom: 24 }}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FEF3C7', justifyContent: 'center', alignItems: 'center' }}>
              <ShieldAlert size={44} color="#F59E0B" strokeWidth={1.5} />
            </View>
            <View style={{ position: 'absolute', bottom: 0, right: -4, backgroundColor: '#EF4444', padding: 6, borderRadius: 16, borderWidth: 3, borderColor: isDark ? "#0F172A" : "#FFFFFF" }}>
              <Lock size={14} color="#FFFFFF" />
            </View>
          </View>

          <Text style={{ fontSize: 22, fontWeight: "800", color: isDark ? "#F1F5F9" : "#0F172A", textAlign: "center", marginBottom: 12, letterSpacing: -0.5 }}>
            Access Restricted
          </Text>
          
          <Text style={{ fontSize: 15, color: isDark ? "#94A3B8" : "#64748B", textAlign: "center", lineHeight: 22, marginBottom: 24 }}>
            Your account is currently awaiting administrative approval. Core operational tools are locked until you are verified.
          </Text>

          <View style={{ width: '100%', backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center' }}>
            <Clock3 size={20} color="#F59E0B" style={{ marginRight: 12 }} />
            <View>
              <Text style={{ fontSize: 12, color: isDark ? '#FCD34D' : '#D97706', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>Status</Text>
              <Text style={{ fontSize: 16, color: isDark ? '#FDE68A' : '#92400E', fontWeight: '600' }}>Approval Pending</Text>
            </View>
          </View>
        </View>

        {/* Available Features Section */}
        <View style={{ marginTop: 32, paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: isDark ? "#64748B" : "#94A3B8", textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>
            Available while under review
          </Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? '#1E293B' : '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <MessageSquare size={24} color="#0EA5E9" />
              </View>
              <Text style={{ fontSize: 13, color: isDark ? "#CBD5E1" : "#475569", fontWeight: '500' }}>Messages</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? '#1E293B' : '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <Bell size={24} color="#8B5CF6" />
              </View>
              <Text style={{ fontSize: 13, color: isDark ? "#CBD5E1" : "#475569", fontWeight: '500' }}>Alerts</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? '#1E293B' : '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <CheckCircle size={24} color="#10B981" />
              </View>
              <Text style={{ fontSize: 13, color: isDark ? "#CBD5E1" : "#475569", fontWeight: '500' }}>Profile</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onMessagesPress}
            style={{ 
              width: "100%", 
              backgroundColor: isDark ? "#0EA5E9" : "#0D9488", 
              borderRadius: 16, 
              paddingVertical: 18, 
              flexDirection: "row", 
              justifyContent: "center", 
              alignItems: "center",
              shadowColor: isDark ? '#0EA5E9' : '#0D9488',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            }}>
            <MessageSquare size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.5 }}>Go to Messages</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

export function OfficerApprovalLoading() {
  const isDark = useColorScheme() === "dark";
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: isDark ? "#020617" : "#F8FAFC" }}>
      <View style={{ width: 80, height: 80, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 40, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 5, marginBottom: 24 }}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
      <Text style={{ color: isDark ? "#F1F5F9" : "#0F172A", fontSize: 18, fontWeight: "700", letterSpacing: -0.5, marginBottom: 8 }}>Authenticating...</Text>
      <Text style={{ color: isDark ? "#64748B" : "#94A3B8", fontSize: 14, fontWeight: "500" }}>Securing your session</Text>
    </View>
  );
}
