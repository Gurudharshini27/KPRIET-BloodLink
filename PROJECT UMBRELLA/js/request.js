import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ===============================
// FIREBASE CONFIGURATION
// ===============================

const firebaseConfig = {
    apiKey: "AIzaSyDcA5zN8Y54ARw9L9Bc0RYJ7PEDKAYCB2c",
    authDomain: "bloodlink-kpriet.firebaseapp.com",
    projectId: "bloodlink-kpriet",
    storageBucket: "bloodlink-kpriet.firebasestorage.app",
    messagingSenderId: "733029131301",
    appId: "1:733029131301:web:d7304f4a76d57ac4ab8bcc"
};


// ===============================
// INITIALIZE FIREBASE
// ===============================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firebase connected successfully!");


// ===============================
// BLOOD REQUEST FORM
// ===============================

const form = document.getElementById("bloodRequestForm");

if (!form) {

    console.error("ERROR: bloodRequestForm was not found!");

} else {

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        console.log("Submit button clicked!");


        // ===============================
        // GET VALUES FROM FORM
        // ===============================

        const bloodGroup =
            document.getElementById("bloodGroup").value;

        const unitsRequired =
            Number(
                document.getElementById("unitsRequired").value
            );

        const hospital =
            document.getElementById("hospital").value;

        const requiredDate =
            document.getElementById("requiredDate").value;

        const requiredTime =
            document.getElementById("requiredTime").value;

        const emergency =
            document.getElementById("emergency").value;

        const contactInfo =
            document.getElementById("contactInfo").value;


        // ===============================
        // CHECK REQUIRED FIELDS
        // ===============================

        if (
            !bloodGroup ||
            !unitsRequired ||
            !hospital ||
            !requiredDate ||
            !requiredTime ||
            !emergency ||
            !contactInfo
        ) {

            alert("Please fill all the required fields.");

            return;
        }


        // ===============================
        // CREATE BLOOD REQUEST
        // ===============================

        const requestData = {

            bloodGroup: bloodGroup,

            unitsRequired: unitsRequired,

            hospital: hospital,

            requiredDate: requiredDate,

            requiredTime: requiredTime,

            emergency: emergency,

            contactInfo: contactInfo,

            status: "pending",

            createdAt: serverTimestamp()

        };


        // ===============================
        // SAVE REQUEST TO FIRESTORE
        // ===============================

        try {

            console.log(
                "Sending data to Firestore..."
            );


            const docRef = await addDoc(

                collection(
                    db,
                    "blood_requests"
                ),

                requestData

            );


            console.log(
                "Blood request created:",
                docRef.id
            );


            // ===============================
            // SUCCESS MESSAGE
            // ===============================

            alert(
                "Blood request submitted successfully!\n\n" +
                "Request ID: " +
                docRef.id
            );


            // ===============================
            // RESET FORM
            // ===============================

            form.reset();


            // ===============================
            // GO TO MATCHING PAGE
            // ===============================

            window.location.href =
                "matching.html?requestId=" +
                encodeURIComponent(docRef.id);

        }


        // ===============================
        // ERROR HANDLING
        // ===============================

        catch (error) {

            console.error(
                "Error adding blood request:",
                error
            );


            alert(
                "Failed to submit blood request.\n\n" +
                "Error: " +
                error.message
            );

        }

    });

}