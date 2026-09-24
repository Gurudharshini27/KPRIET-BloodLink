import {
    collection,
    addDoc,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "./firebase-config.js";


// Current logged-in donor
const CURRENT_DONOR_ID = "KZqb6ZeNpRDm9ndu05PF";


// ==============================
// ACCEPT REQUEST
// ==============================

window.acceptRequest = async function (requestId) {

    try {

        // Check whether donor already responded
        const existingQuery = query(

            collection(
                db,
                "Request_responses"
            ),

            where(
                "Donor_id",
                "==",
                CURRENT_DONOR_ID
            ),

            where(
                "Request_id",
                "==",
                requestId
            )
        );


        const existing =
            await getDocs(existingQuery);


        // Already responded
        if (!existing.empty) {

            alert(
                "You have already responded to this request."
            );

            return;
        }


        // Add accepted response
        await addDoc(

            collection(
                db,
                "Request_responses"
            ),

            {
                Donor_id:
                    CURRENT_DONOR_ID,

                Request_id:
                    requestId,

                Status:
                    "Accepted"
            }
        );


        alert(
            "✅ Request accepted successfully!"
        );

    }

    catch (error) {

        console.error(
            "Error accepting request:",
            error
        );

        alert(
            "Unable to accept the request."
        );
    }
};



// ==============================
// DECLINE REQUEST
// ==============================

window.declineRequest = async function (requestId) {

    try {

        // Check whether donor already responded
        const existingQuery = query(

            collection(
                db,
                "Request_responses"
            ),

            where(
                "Donor_id",
                "==",
                CURRENT_DONOR_ID
            ),

            where(
                "Request_id",
                "==",
                requestId
            )
        );


        const existing =
            await getDocs(existingQuery);


        // Already responded
        if (!existing.empty) {

            alert(
                "You have already responded to this request."
            );

            return;
        }


        // Add declined response
        await addDoc(

            collection(
                db,
                "Request_responses"
            ),

            {
                Donor_id:
                    CURRENT_DONOR_ID,

                Request_id:
                    requestId,

                Status:
                    "Declined"
            }
        );


        alert(
            "Response recorded."
        );

    }

    catch (error) {

        console.error(
            "Error declining request:",
            error
        );

        alert(
            "Unable to record the response."
        );
    }
};