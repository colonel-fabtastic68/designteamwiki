import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const subteamPrefixes = {
  'driver-controls': '4',
  'chassis': '3',
  'electronics': '5',
  'vehicle-dynamics': '7',
  'aerodynamics': '2',
  'business': '8',
  'powertrain': '6',
  'general': '0'
};

export const addSerialNumbersToExistingDocs = async () => {
  try {
    console.log('Starting to add serial numbers to existing documents...');
    
    // Get all documents
    const querySnapshot = await getDocs(collection(db, 'documents'));
    
    // Group documents by subteam
    const docsBySubteam = {};
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (!data.serialNumber && data.subteam) {
        if (!docsBySubteam[data.subteam]) {
          docsBySubteam[data.subteam] = [];
        }
        docsBySubteam[data.subteam].push({
          id: docSnapshot.id,
          ...data
        });
      }
    });
    
    console.log('Documents without serial numbers by subteam:', docsBySubteam);
    
    // Add serial numbers to each subteam's documents
    for (const [subteamId, docs] of Object.entries(docsBySubteam)) {
      const prefix = subteamPrefixes[subteamId];
      if (!prefix) {
        console.warn('No prefix found for subteam:', subteamId);
        continue;
      }
      
      // Sort by creation date to maintain chronological order
      docs.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateA - dateB;
      });
      
      // Assign serial numbers
      for (let i = 0; i < docs.length; i++) {
        const serialNumber = `KB${prefix}${(i + 1).toString().padStart(4, '0')}`;
        const docRef = doc(db, 'documents', docs[i].id);
        
        try {
          await updateDoc(docRef, {
            serialNumber: serialNumber
          });
          console.log(`Updated document ${docs[i].id} with serial number ${serialNumber}`);
        } catch (error) {
          console.error(`Failed to update document ${docs[i].id}:`, error);
        }
      }
    }
    
    console.log('Finished adding serial numbers to existing documents');
  } catch (error) {
    console.error('Error adding serial numbers:', error);
  }
}; 