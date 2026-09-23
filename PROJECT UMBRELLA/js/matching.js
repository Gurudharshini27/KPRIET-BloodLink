import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================
// FIREBASE CONFIGURATION
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyDcA5zN8Y54ARw9L9Bc0RYJ7PEDKAYCB2c",
    authDomain: "bloodlink-kpriet.firebaseapp.com",
    projectId: "bloodlink-kpriet",
    storageBucket: "bloodlink-kpriet.firebasestorage.app",
    messagingSenderId: "733029131301",
    appId: "1:733029131301:web:d7304f4a76d57ac4ab8bcc"
};


// ==========================================
// INITIALIZE FIREBASE
// ==========================================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firebase matching system connected successfully!");


// ==========================================
// BLOOD COMPATIBILITY
// ==========================================

const compatibleDonors = {

    "A+": ["A+", "A-", "O+", "O-"],

    "A-": ["A-", "O-"],

    "B+": ["B+", "B-", "O+", "O-"],

    "B-": ["B-", "O-"],

    "AB+": [
        "AB+",
        "AB-",
        "A+",
        "A-",
        "B+",
        "B-",
        "O+",
        "O-"
    ],

    "AB-": [
        "AB-",
        "A-",
        "B-",
        "O-"
    ],

    "O+": ["O+", "O-"],

    "O-": ["O-"]

};


// ==========================================
// FIND MATCHING DONORS
// ==========================================

async function findMatchingDonors(requestId) {

    try {

        // ------------------------------------------
        // Validate Request ID
        // ------------------------------------------

        if (!requestId || !requestId.trim()) {

            console.error("Request ID is missing.");

            return [];

        }

        requestId = requestId.trim();

        console.log(
            "Finding donors for request:",
            requestId
        );


        // ==========================================
        // GET EXACT BLOOD REQUEST
        // ==========================================

        const requestRef = doc(
            db,
            "blood_requests",
            requestId
        );

        const requestSnapshot =
            await getDoc(requestRef);


        // ------------------------------------------
        // Check whether request exists
        // ------------------------------------------

        if (!requestSnapshot.exists()) {

            console.error(
                "Blood request not found:",
                requestId
            );

            return [];

        }


        const requestData =
            requestSnapshot.data();


        console.log(
            "Blood request data:",
            requestData
        );


        // ==========================================
        // GET REQUIRED BLOOD GROUP
        // ==========================================

        const requiredBloodGroup =
            String(
                requestData.bloodGroup || ""
            )
            .trim()
            .toUpperCase();


        console.log(
            "Required blood group:",
            requiredBloodGroup
        );


        // ------------------------------------------
        // Validate blood group
        // ------------------------------------------

        if (
            !compatibleDonors[
                requiredBloodGroup
            ]
        ) {

            console.error(
                "Invalid blood group:",
                requiredBloodGroup
            );

            return [];

        }


        // ==========================================
        // GET AVAILABLE DONORS
        // ==========================================

        const donorQuery = query(

            collection(db, "users"),

            where(
                "Availability",
                "==",
                true
            )

        );


        const donorSnapshot =
            await getDocs(donorQuery);


        console.log(
            "Available donors:",
            donorSnapshot.size
        );


        // ==========================================
        // FIND COMPATIBLE DONORS
        // ==========================================

        const matchingDonors = [];


        donorSnapshot.forEach((donorDoc) => {

            const donor =
                donorDoc.data();


            // --------------------------------------
            // Normalize donor blood group
            // --------------------------------------

            const donorBloodGroup =
                String(
                    donor.Blood_group || ""
                )
                .trim()
                .toUpperCase();


            // --------------------------------------
            // Check compatibility
            // --------------------------------------

            const isCompatible =
                compatibleDonors[
                    requiredBloodGroup
                ].includes(
                    donorBloodGroup
                );


            if (isCompatible) {

                matchingDonors.push({

                    donorId:
                        donorDoc.id,

                    name:
                        donor.Name ||
                        "Unknown",

                    bloodGroup:
                        donorBloodGroup,

                    phone:
                        donor.Phone ||
                        "",

                    email:
                        donor.College_email ||
                        "",

                    department:
                        donor.Department ||
                        "",

                    year:
                        donor.Year ||
                        "",

                    lastDonationDate:
                        donor.Last_donation_date ||
                        ""

                });

            }

        });


        // ==========================================
        // SHOW RESULTS IN CONSOLE
        // ==========================================

        console.log(
            "Matching donors found:",
            matchingDonors.length
        );

        console.table(
            matchingDonors
        );


        // ==========================================
        // RETURN MATCHING DONORS
        // ==========================================

        return matchingDonors;


    } catch (error) {

        console.error(
            "Error finding matching donors:",
            error
        );

        return [];

    }

}


// ==========================================
// MAKE FUNCTION AVAILABLE TO matching.html
// ==========================================

window.findMatchingDonors =
    findMatchingDonors;