
import {
    collection,
    query,
    where,
    onSnapshot,
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "./firebase-config.js";

// Current logged-in donor
const CURRENT_DONOR_ID = "KZqb6ZeNpRDm9ndu05PF";

const notificationsContainer =
    document.getElementById("notifications");

// Load blood request notifications
async function loadNotifications() {

    try {

        // Get current donor
        const donorRef = doc(
            db,
            "users",
            CURRENT_DONOR_ID
        );

        const donorSnapshot = await getDoc(donorRef);

        // Check donor exists
        if (!donorSnapshot.exists()) {

            notificationsContainer.innerHTML =
                "<p>Donor profile not found.</p>";

            return;
        }

        const donor = donorSnapshot.data();

        const donorBloodGroup =
            donor.Blood_group;

        // Debug: Display donor blood group in browser console
        console.log(
            "Donor Blood Group:",
            donorBloodGroup
        );

        // Find matching open blood requests
        const requestsQuery = query(
            collection(db, "Blood_requests"),

            where(
                "Blood_group",
                "==",
                donorBloodGroup
            ),

            where(
                "Status",
                "==",
                "Open"
            )
        );

        // Listen for new requests
        onSnapshot(
            requestsQuery,
            (snapshot) => {

                notificationsContainer.innerHTML = "";

                // Debug: Display number of matching requests
                console.log(
                    "Matching Requests:",
                    snapshot.size
                );

                // No requests
                if (snapshot.empty) {

                    notificationsContainer.innerHTML =
                        "<p>No matching blood requests at the moment.</p>";

                    return;
                }

                // Display every matching request
                snapshot.forEach(
                    (requestDoc) => {

                        const request =
                            requestDoc.data();

                        const notification =
                            document.createElement("div");

                        notification.className =
                            "notification";

                        notification.innerHTML = `

                            <h3>
                                🩸 Blood Request
                            </h3>

                            <p>
                                <strong>Blood Group:</strong>
                                ${request.Blood_group}
                            </p>

                            <p>
                                <strong>Hospital:</strong>
                                ${request.Hospital}
                            </p>

                            <p>
                                <strong>Units Required:</strong>
                                ${request.Units}
                            </p>

                            <p>
                                <strong>Date:</strong>
                                ${request.Required_date}
                            </p>

                            <p>
                                <strong>Time:</strong>
                                ${request.Required_time}
                            </p>

                            <button
                                class="accept-btn"
                                onclick="acceptRequest('${requestDoc.id}')">

                                Accept

                            </button>

                            <button
                                class="decline-btn"
                                onclick="declineRequest('${requestDoc.id}')">

                                Decline

                            </button>

                        `;

                        notificationsContainer.appendChild(
                            notification
                        );

                    }
                );

            },

            (error) => {

                console.error(
                    "Firestore listener error:",
                    error
                );

                notificationsContainer.innerHTML =
                    "<p>Unable to load notifications.</p>";
            }
        );

    }

    catch (error) {

        console.error(
            "Error loading notifications:",
            error
        );

        notificationsContainer.innerHTML =
            "<p>Unable to load notifications.</p>";
    }
}

// Start notifications
loadNotifications();