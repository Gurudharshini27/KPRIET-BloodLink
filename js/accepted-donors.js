import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { db } from "./firebase-config.js";

// Correct Request ID from Firestore
const REQUEST_ID = "pIb6GPdi3mxXBtMDkrk0";

// HTML container
const acceptedDonorsContainer = document.getElementById("accepted-donors");

// Load accepted donors
async function loadAcceptedDonors() {
    try {
        acceptedDonorsContainer.innerHTML = "<p>Loading accepted donors...</p>";

        // Find accepted responses for this request
        const responsesQuery = query(
            collection(db, "Request_responses"),
            where("Request_id", "==", REQUEST_ID),
            where("Status", "==", "Accepted")
        );

        const responsesSnapshot = await getDocs(responsesQuery);

        if (responsesSnapshot.empty) {
            acceptedDonorsContainer.innerHTML =
                "<p>No donors have accepted this request yet.</p>";
            return;
        }

        acceptedDonorsContainer.innerHTML = "";

        for (const responseDocument of responsesSnapshot.docs) {
            const responseData = responseDocument.data();

            const donorId = responseData.Donor_id;

            // Get donor details from users collection
            const donorReference = doc(db, "users", donorId);
            const donorSnapshot = await getDoc(donorReference);

            if (!donorSnapshot.exists()) {
                continue;
            }

            const donorData = donorSnapshot.data();

            // Support common field-name formats
            const donorName =
                donorData.Name ||
                donorData.name ||
                "Name not available";

            const bloodGroup =
                donorData.Blood_group ||
                donorData.blood_group ||
                "Not available";

            const phone =
                donorData.Phone ||
                donorData.phone ||
                donorData.Phone_number ||
                "Not available";

            // Create donor card
            const donorCard = document.createElement("div");
            donorCard.className = "donor-card";

            donorCard.innerHTML = `
                <h3>🩸 Accepted Donor</h3>
                <p><strong>Name:</strong> ${donorName}</p>
                <p><strong>Blood Group:</strong> ${bloodGroup}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                ${
                    phone !== "Not available"
                        ? `<a href="tel:${phone}">📞 Contact Donor</a>`
                        : ""
                }
            `;

            acceptedDonorsContainer.appendChild(donorCard);
        }

        if (acceptedDonorsContainer.innerHTML.trim() === "") {
            acceptedDonorsContainer.innerHTML =
                "<p>Donor details could not be found.</p>";
        }

    } catch (error) {
        console.error("Error loading accepted donors:", error);

        acceptedDonorsContainer.innerHTML =
            "<p>Unable to load accepted donors. Please try again.</p>";
    }
}

// Start loading
loadAcceptedDonors();