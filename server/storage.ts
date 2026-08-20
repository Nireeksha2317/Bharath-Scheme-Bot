import { db } from "./db";
import { 
  schemes, conversationMessages, users, userProfiles, savedSchemes, applications, conversations,
  type Scheme, type InsertScheme, type User, type InsertUser, type UserProfile, type InsertUserProfile,
  type SavedScheme, type InsertSavedScheme, type Application, type InsertApplication
} from "@shared/schema";
import { eq, like, or, and, sql } from "drizzle-orm";

export interface IStorage {
  // Schemes
  getAllSchemes(category?: string, state?: string, search?: string, source?: string): Promise<Scheme[]>;
  getSchemeById(id: number): Promise<Scheme | undefined>;
  createScheme(scheme: InsertScheme): Promise<Scheme>;
  seedSchemes(schemesList: InsertScheme[]): Promise<void>;

  // Chat Logs (Legacy signature for compatibility)
  logChat(log: any): Promise<any>;

  // Users
  getUserByDeviceId(deviceId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Profiles
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  upsertUserProfile(userId: number, profile: Partial<InsertUserProfile>): Promise<UserProfile>;

  // Saved Schemes
  getSavedSchemes(userId: number): Promise<{ saved: SavedScheme, scheme: Scheme }[]>;
  saveScheme(savedScheme: InsertSavedScheme): Promise<SavedScheme>;
  removeSavedScheme(userId: number, schemeId: number): Promise<void>;

  // Applications
  getApplications(userId: number): Promise<{ app: Application, scheme: Scheme }[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplicationStatus(id: number, status: string): Promise<Application>;
  
  // Analytics
  getMetrics(): Promise<{ totalUsers: number, totalApplications: number, totalSavedSchemes: number }>;
}

export class DatabaseStorage implements IStorage {
  async getAllSchemes(category?: string, state?: string, search?: string, source?: string): Promise<Scheme[]> {
    let conditions = [];

    if (category) {
      conditions.push(like(schemes.category, `%${category}%`));
    }

    if (state) {
      conditions.push(or(
        like(schemes.state, `%${state}%`),
        like(schemes.state, 'Pan India'),
        like(schemes.state, 'Karnataka')
      ));
    }

    if (source) {
      conditions.push(like(schemes.source, `%${source}%`));
    }

    if (search) {
      conditions.push(or(
        like(schemes.name, `%${search}%`),
        like(schemes.description, `%${search}%`),
        like(schemes.benefits, `%${search}%`),
        like(schemes.keywords, `%${search}%`) // Search within JSON string
      ));
    }

    if (conditions.length > 0) {
      return await db.select().from(schemes).where(and(...conditions));
    }

    return await db.select().from(schemes);
  }

  async getSchemeById(id: number): Promise<Scheme | undefined> {
    const [scheme] = await db.select().from(schemes).where(eq(schemes.id, id));
    return scheme;
  }

  async createScheme(scheme: InsertScheme): Promise<Scheme> {
    const [newScheme] = await db.insert(schemes).values(scheme).returning();
    return newScheme;
  }

  async seedSchemes(schemesList: InsertScheme[]): Promise<void> {
    const existing = await db.select({ count: sql<number>`count(*)` }).from(schemes);
    if (Number(existing[0].count) === 0) {
      await db.insert(schemes).values(schemesList);
    }
  }

  async logChat(log: any): Promise<any> {
    // Ensure mock conversation exists
    const existingConv = await db.select().from(conversations).where(eq(conversations.id, 1));
    if (existingConv.length === 0) {
      await db.insert(conversations).values({ id: 1 });
    }

    const [newLog] = await db.insert(conversationMessages).values({
      conversationId: 1, // Mock conversation ID until full auth
      sender: "user",
      message: log.userMessage,
      intent: log.intent,
      language: log.language
    }).returning();
    
    // Also log bot response
    await db.insert(conversationMessages).values({
      conversationId: 1, // Mock conversation ID
      sender: "bot",
      message: log.botResponse,
      intent: null,
      language: log.language
    });
    
    return newLog;
  }

  // Users
  async getUserByDeviceId(deviceId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.deviceId, deviceId));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Profiles
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async upsertUserProfile(userId: number, profile: Partial<InsertUserProfile>): Promise<UserProfile> {
    const existing = await this.getUserProfile(userId);
    if (existing) {
      const [updated] = await db.update(userProfiles)
        .set({ ...profile, lastUpdated: new Date() })
        .where(eq(userProfiles.userId, userId))
        .returning();
      return updated;
    } else {
      const [newProfile] = await db.insert(userProfiles)
        .values({ ...profile, userId } as InsertUserProfile)
        .returning();
      return newProfile;
    }
  }

  // Saved Schemes
  async getSavedSchemes(userId: number): Promise<{ saved: SavedScheme, scheme: Scheme }[]> {
    const results = await db.select({
      saved: savedSchemes,
      scheme: schemes
    })
    .from(savedSchemes)
    .innerJoin(schemes, eq(savedSchemes.schemeId, schemes.id))
    .where(eq(savedSchemes.userId, userId));
    return results;
  }

  async saveScheme(savedScheme: InsertSavedScheme): Promise<SavedScheme> {
    const [newSaved] = await db.insert(savedSchemes).values(savedScheme).returning();
    return newSaved;
  }

  async removeSavedScheme(userId: number, schemeId: number): Promise<void> {
    await db.delete(savedSchemes)
      .where(and(eq(savedSchemes.userId, userId), eq(savedSchemes.schemeId, schemeId)));
  }

  // Applications
  async getApplications(userId: number): Promise<{ app: Application, scheme: Scheme }[]> {
    const results = await db.select({
      app: applications,
      scheme: schemes
    })
    .from(applications)
    .innerJoin(schemes, eq(applications.schemeId, schemes.id))
    .where(eq(applications.userId, userId));
    return results;
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const [newApp] = await db.insert(applications).values(application).returning();
    return newApp;
  }

  async updateApplicationStatus(id: number, status: string): Promise<Application> {
    const [updatedApp] = await db.update(applications)
      .set({ status, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return updatedApp;
  }

  // Analytics
  async getMetrics(): Promise<{ totalUsers: number, totalApplications: number, totalSavedSchemes: number }> {
    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [appsCount] = await db.select({ count: sql<number>`count(*)` }).from(applications);
    const [savedCount] = await db.select({ count: sql<number>`count(*)` }).from(savedSchemes);
    
    return {
      totalUsers: Number(usersCount.count),
      totalApplications: Number(appsCount.count),
      totalSavedSchemes: Number(savedCount.count),
    };
  }
}

export const storage = new DatabaseStorage();
