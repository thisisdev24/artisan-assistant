import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const CreateListing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sellerStore = user?.store;
  const sellerId = user?.id;
  const [main_category] = useState("Handmade");
  const title = useState("");
  const [average_rating] = useState("");
  const [rating_number] = useState("");
  const [files, setFiles] = useState([]);
  const [store, setStore] = useState(() => {
    if (typeof window !== "undefined") {
      const cachedStore = localStorage.getItem("store");
      if (cachedStore) return cachedStore;
    }
    return sellerStore || "";
  });
  const [categories] = useState([]);
  const [details] = useState("");
  const [parent_asin] = useState("");
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (sellerStore) {
      setStore(sellerStore);
    }
  }, [sellerStore]);

  async function submit(e) {
    e.preventDefault();

    if (files.length === 0) {
      alert("Please upload at least one image.");
      return;
    }

    if (loading) {
      return; // Prevent double submission
    }

    setLoading(true);

    try {
      // Step 1: Create draft listing
      const draftData = {
        main_category: main_category || "Handmade",
        title: String(title),
        average_rating: average_rating || "",
        rating_number: rating_number || "",
        features: [""],
        description: "",
        price: Number(0),
        store: store || sellerStore || "",
        artisan_id: sellerId || "",
        seller: sellerId || "",
        categories:
          Array.isArray(categories) && categories.length > 0
            ? JSON.stringify(categories)
            : JSON.stringify([]),
        details: details || "",
        parent_asin: parent_asin || "",
      };

      console.log("Creating draft with data:", draftData);
      const draftRes = await axios.post(
        "http://localhost:5000/api/drafts/draft",
        draftData,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {}),
          },
        }
      );

      console.log("Draft response:", draftRes.data);

      // Extract draft ID from response - handle different response structures
      let draftId = null;
      if (draftRes.data.id) {
        draftId = draftRes.data.id.toString();
      } else if (draftRes.data.listing?._id) {
        draftId = draftRes.data.listing._id.toString();
      } else if (draftRes.data._id) {
        draftId = draftRes.data._id.toString();
      }

      if (!draftId) {
        console.error(
          "Could not extract draft ID from response:",
          draftRes.data
        );
        throw new Error(
          "Draft ID not found in response. Please check the console for details."
        );
      }

      console.log("Draft ID extracted:", draftId);

      // Step 2: Upload images to the draft
      const imageFormData = new FormData();
      files.forEach((f) => imageFormData.append("images", f));

      console.log("Uploading images...");
      await axios.post(
        `http://localhost:5000/api/drafts/${draftId}/images`,
        imageFormData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            ...(token ? { Authorization: "Bearer " + token } : {}),
          },
        }
      );

      console.log("Images uploaded successfully. Redirecting...");

      // Step 3: Redirect to product details form
      try {
        navigate(`/product-details/${draftId}`);
        // Fallback navigation in case navigate doesn't work
        setTimeout(() => {
          if (window.location.pathname !== `/product-details/${draftId}`) {
            console.log("Navigate did not work, using window.location");
            window.location.href = `/product-details/${draftId}`;
          }
        }, 100);
      } catch (navError) {
        console.error("Navigation error:", navError);
        window.location.href = `/product-details/${draftId}`;
      }
    } catch (err) {
      console.error("Draft creation error:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      alert(
        err?.response?.data?.message ||
          err.message ||
          "Failed to create draft. See console for details."
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-50 p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-lg bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-blue-100 select-none"
      >
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-700">
          Publish Your Product
        </h2>

        <div className="mb-5">
          <label className="block text-gray-700 mb-2">Upload Images</label>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
            className="w-full"
          />
        </div>

        <div className="flex gap-4 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-500 text-white py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Draft..." : "Publish Draft"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateListing;
