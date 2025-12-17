import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const ProductDetailsForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [stock, setStock] = useState("");
  const [stockAvailable, setStockAvailable] = useState(true);
  const [height, setHeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [listing, setListing] = useState(null);
  // color auto-fill: detected_colors from server and chosen main color
  const [detectedColors, setDetectedColors] = useState([]); // array of {hex, percentage, name, source_image}
  const [mainColor, setMainColor] = useState(""); // hex
  const [clipTags, setClipTags] = useState([]); // array of per-image tag objects from ML

  useEffect(() => {
    // Fetch draft listing details to show preview
    const fetchDraft = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/listings/${id}`,
          {
            headers: {
              ...(token ? { Authorization: "Bearer " + token } : {}),
            },
          }
        );
        setListing(res.data);

        // seed color suggestions if server provided them
        if (
          res.data &&
          res.data.detected_colors &&
          Array.isArray(res.data.detected_colors) &&
          res.data.detected_colors.length > 0
        ) {
          setDetectedColors(res.data.detected_colors);
          if (!mainColor && res.data.suggested_main_color) {
            setMainColor(res.data.suggested_main_color);
          } else if (!mainColor) {
            setMainColor(res.data.detected_colors[0].hex);
          }

          // seed clip tags if server provided them
          if (res.data && (res.data.clip_tags || res.data.clipTags)) {
            // backend stores as "clip_tags" (snake_case) from listingDrafts.js
            const tags = res.data.clip_tags || res.data.clipTags;
            if (Array.isArray(tags)) {
              setClipTags(tags);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching draft:", err);
      }
    };
    if (id) {
      fetchDraft();
    }
  }, [id, token, mainColor]);

  async function handlePublish(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const dimensions = {
        height: height ? parseFloat(height) : undefined,
        length: length ? parseFloat(length) : undefined,
        width: width ? parseFloat(width) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
      };

      const publishData = {
        stock: stock ? parseInt(stock) : 0,
        stock_available: stockAvailable,
        dimensions,
        main_color: mainColor || undefined, // server schema can pick this up; optional
      };

      await axios.patch(
        `http://localhost:5000/api/drafts/${id}/publish`,
        publishData,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {}),
          },
        }
      );

      alert("Product published successfully!");
      navigate(`/product/${id}`);
    } catch (err) {
      console.error("Publish error:", err?.response?.data || err.message);
      alert(
        err?.response?.data?.message ||
          "Failed to publish. See console for details."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-white to-green-50 p-6">
      <div className="w-full max-w-2xl bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-green-100">
        <h2 className="text-3xl font-bold text-center mb-6 text-green-700">
          Product Details
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Add additional details to complete your listing
        </p>

        {listing && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Preview:</h3>
            <p className="text-blue-700">
              <strong>Title:</strong> {listing.title}
            </p>
            <p className="text-blue-700">
              <strong>Price:</strong> ₹{listing.price}
            </p>

            {/* Suggested colors (if any) */}
            {detectedColors && detectedColors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">
                  Suggested colors (auto-detected):
                </p>
                <div className="flex items-center gap-2">
                  {detectedColors.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMainColor(c.hex)}
                      title={`${c.name || ""} ${Math.round(
                        (c.percentage || 0) * 100
                      )}%`}
                      className="w-10 h-10 rounded-md border"
                      style={{ background: c.hex }}
                    />
                  ))}
                  <div className="ml-4">
                    <span className="text-sm text-gray-700">
                      Chosen main color:
                    </span>
                    <div
                      className="inline-block ml-2 align-middle w-8 h-8 rounded border"
                      style={{ background: mainColor || "#ffffff" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CLIP Tag Suggestions (materials / styles / colors / occasions) */}
            {clipTags && clipTags.length > 0 && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Auto-suggested tags (from image analysis)
                </h4>
                <div className="space-y-4">
                  {clipTags.map((t, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      {/* show small thumbnail or icon for the image if available */}
                      <div className="w-16 h-16 rounded-md overflow-hidden border">
                        <img
                          src={t.image}
                          alt={`img-${idx}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm text-gray-600 mb-1">
                          Image suggestions
                        </div>

                        {/* Materials */}
                        {t.materials && t.materials.length > 0 && (
                          <div className="mb-1">
                            <div className="text-xs text-gray-500 mb-1">
                              Materials
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {t.materials.map((m, mi) => (
                                <button
                                  key={mi}
                                  type="button"
                                  className="text-xs px-2 py-1 rounded bg-blue-50 border text-blue-700"
                                  title={`score ${m.score.toFixed(3)}`}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Styles */}
                        {t.styles && t.styles.length > 0 && (
                          <div className="mb-1">
                            <div className="text-xs text-gray-500 mb-1">
                              Styles
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {t.styles.map((s, si) => (
                                <button
                                  key={si}
                                  type="button"
                                  className="text-xs px-2 py-1 rounded bg-green-50 border text-green-700"
                                  title={`score ${s.score.toFixed(3)}`}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Merged Colors (canonical) */}
                        {t.merged_colors && t.merged_colors.length > 0 && (
                          <div className="mb-1">
                            <div className="text-xs text-gray-500 mb-1">
                              Colors
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {t.merged_colors.map((c, ci) => (
                                <div
                                  key={ci}
                                  className="flex items-center gap-2 px-2 py-1 rounded border"
                                >
                                  <div
                                    className="w-6 h-6 rounded-sm border"
                                    style={{
                                      background: c.startsWith("#")
                                        ? c
                                        : undefined,
                                    }}
                                  />
                                  <span className="text-xs">{c}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Occasions */}
                        {t.occasions && t.occasions.length > 0 && (
                          <div className="mb-1">
                            <div className="text-xs text-gray-500 mb-1">
                              Occasions
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {t.occasions.map((o, oi) => (
                                <button
                                  key={oi}
                                  type="button"
                                  className="text-xs px-2 py-1 rounded bg-yellow-50 border text-yellow-700"
                                  title={`score ${o.score.toFixed(3)}`}
                                >
                                  {o.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handlePublish}>
          {/* Stock Information */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Stock Information
            </h3>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Stock Count</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Enter available stock count"
                min="0"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-green-300"
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center text-gray-700">
                <input
                  type="checkbox"
                  checked={stockAvailable}
                  onChange={(e) => setStockAvailable(e.target.checked)}
                  className="mr-2 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span>Stock Available</span>
              </label>
            </div>
          </div>

          {/* Product Dimensions */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Product Dimensions
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2">Height (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Height in cm"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-green-300"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Length (cm)</label>
                <input
                  type="number"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="Length in cm"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-green-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2">Width (cm)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="Width in cm"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-green-300"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  Weight (grams)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Weight in grams"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-green-300"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition font-semibold"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Publishing..." : "🚀 Publish Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductDetailsForm;
