import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface SubscriptionPackage {
  id: string;
  name: string;
  price: string;
  description: string;
}

export const PREMIUM_PACKAGE: SubscriptionPackage = {
  id: 'trucast_premium',
  name: 'TruCast Premium',
  price: '$9.99/mo',
  description: 'فتح شارات المشاهير، وضع التخفي، قفل المحادثات، تحويل الصوت لنص، وثيمات مخصصة.'
};

export const subscriptionService = {
  /**
   * Mock purchase function for Sandbox testing
   */
  async purchasePremium(userId: string): Promise<boolean> {
    console.log(`[RevenueCat Sandbox] Initiating purchase for package: ${PREMIUM_PACKAGE.id}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      // Mock successful purchase update in Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isPremium: true,
        updatedAt: new Date().toISOString()
      });
      
      console.log(`[RevenueCat Sandbox] Purchase successful for user: ${userId}`);
      return true;
    } catch (error) {
      console.error(`[RevenueCat Sandbox] Purchase failed:`, error);
      return false;
    }
  },

  async checkSubscriptionStatus(userId: string): Promise<boolean> {
    // In a real app, we'd check RevenueCat SDK here
    return false; 
  }
};
