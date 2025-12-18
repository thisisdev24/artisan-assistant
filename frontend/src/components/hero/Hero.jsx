import { useState, useEffect } from "react";
import LoopingAnimatedBackground from "./LoopingAnimatedBackground";
import Slider from "react-slick"; // Import Slider
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import imgage1 from "../../assets/hero/fabrics.avif";
import image2 from "../../assets/hero/glassworks.avif";
import image3 from "../../assets/hero/leather.jpg";
import image4 from "../../assets/hero/potmaking.avif";
import image5 from "../../assets/hero/woodcraft.avif";
import { Link } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

const imageList = [
  {
    id: 1,
    img: imgage1,
    title: "Fabrics",
    desc: "Explore our exquisite collection of fabrics, where vibrant colors and intricate patterns come together to inspire your creativity.",
  },
  {
    id: 2,
    img: image2,
    title: "Glassworks",
    desc: "Discover the art of glassworks, where skilled artisans transform molten glass into stunning creations that captivate the eye and ignite the imagination.",
  },
  {
    id: 3,
    img: image3,
    title: "Leather",
    desc: "Experience the timeless elegance of leather craftsmanship, where premium materials are transformed into durable and stylish accessories that stand the test of time.",
  },
  {
    id: 4,
    img: image4,
    title: "Potmaking",
    desc: "Immerse yourself in the ancient art of potmaking, where skilled hands shape clay into functional and decorative pieces that tell a story of tradition and creativity.",
  },
  {
    id: 5,
    img: image5,
    title: "Woodcraft",
    desc: "Explore the beauty of woodcraft, where skilled artisans carve and shape wood into intricate designs, creating functional and decorative pieces that showcase the natural elegance of this timeless material.",
  },
];

const Hero = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  var settings = {
    dots: true,
    arrows: false,
    infinite: true,
    speed: 800,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    cssEase: "ease-in-out",
    pauseOnHover: false,
    pauseOnFocus: true,
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const heroVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8 } },
  };

  const illustrationVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 1, delay: 0.3 } },
  };

  /* Small reusable subcomponents used only inside this file */
  const Feature = ({ emoji, title, text }) => (
    <motion.div
      className="flex flex-col gap-2 p-5 rounded-xl bg-white/6 backdrop-blur-sm border-y-2 border-black"
      variants={itemVariants}
      whileHover={{ scale: 1.02 }}
    >
      <div className="text-3xl">{emoji}</div>
      <h4 className="font-semibold text-lg">{title}</h4>
      <p className="text-md text-gray-800">{text}</p>
    </motion.div>
  );

  const CategoryCard = ({ title }) => (
    <motion.div
      className="flex flex-col items-start gap-2 p-4 rounded-lg bg-white/5 border-b-2 border-black"
      variants={itemVariants}
      whileHover={{ scale: 1.02 }}
    >
      <div className="w-12 h-12 rounded-full bg-white/8 flex items-center justify-center text-lg">
        🎨
      </div>
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-gray-700">Explore →</div>
    </motion.div>
  );

  const Testimonial = ({ quote, author }) => (
    <div className="p-4 rounded-lg bg-white/6 border-b-2 border-black">
      <p className="italic text-sm text-gray-800">“{quote}”</p>
      <p className="mt-3 text-xs font-semibold text-gray-700">— {author}</p>
    </div>
  );

  const Artisan = ({ name, skill }) => (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/5 border-b-2 border-black">
      <div className="w-16 h-16 rounded-full bg-white/8 flex items-center justify-center text-xl">
        👤
      </div>
      <div className="text-sm font-semibold">{name}</div>
      <div className="text-xs text-gray-700">{skill}</div>
    </div>
  );

  return (
    <LoopingAnimatedBackground
      speed={20}
      mobileSpeed={18}
      opacity={0.2}
      mobileOpacity={0.1}
      colors={["#FFAD33", "#FFD1B3", "#FFAA80"]}
      density={6}
    >
      {/* hero + vertical sections container */}
      <div className="container mx-auto my-12 select-none">
        {/* ===== SLIDER HERO ===== */}
        <section className="my-16">
          <Slider {...settings}>
            {imageList.map((data) => (
              <div key={data.id} className="overflow-hidden">
                <motion.div
                  className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center mx-auto"
                  initial="hidden"
                  animate={loaded ? "visible" : "hidden"}
                  variants={containerVariants}
                >
                  {/* text content */}
                  <motion.div
                    className="flex flex-col items-start justify-center gap-6 max-w-1/2 max-h-full m-6"
                    variants={heroVariants}
                  >
                    <motion.h1
                      data-aos="zoom-out"
                      data-aos-duration="500"
                      data-aos-once="true"
                      className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black leading-tight uppercase"
                      variants={itemVariants}
                      whileHover={{scale: 1.1}}
                    >
                      {data.title}
                    </motion.h1>
                    <motion.p
                      data-aos="fade-up"
                      data-aos-duration="500"
                      data-aos-delay="100"
                      className="text-base lg:text-lg text-gray-800"
                      variants={itemVariants}
                    >
                      {data.desc}
                    </motion.p>
                    <motion.div
                      data-aos="fade-up"
                      data-aos-duration="500"
                      data-aos-delay="300"
                      variants={itemVariants}
                    >
                      <div className="flex gap-3">
                        <Link
                          to={`/search?query=${data.title}`}
                          className="text-sm sm:text-md lg:text-lg bg-gradient-to-r from-primary/50 to-secondary hover:scale-105 duration-200 text-black py-2 px-4 rounded-full shadow-lg font-semibold"
                        >
                          Order Now
                        </Link>
                        <Link
                          to="/ShowListingPublic"
                          className="text-sm sm:text-md lg:text-lg py-2 px-4 rounded-full border border-black/10 bg-white/5 shadow-lg font-semibold"
                        >
                          Browse Products
                        </Link>
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* image */}
                  <motion.div
                    className="rounded-xl overflow-hidden max-w-1/2 max-h-full m-6"
                    variants={illustrationVariants}
                    whileHover={{scale: 0.9}}
                  >
                    <img
                      src={data.img}
                      alt={data.title}
                      className="w-full h-full object-fill shadow-xl mx-auto duration-100"
                    />
                  </motion.div>
                </motion.div>
              </div>
            ))}
          </Slider>
        </section>

        {/* ===== FEATURES (3 inline) ===== */}
        <section className="mb-10">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center"
            initial="hidden"
            animate={loaded ? "visible" : "hidden"}
            variants={containerVariants}
          >
            <Feature
              emoji="✨"
              title="Handmade & Original"
              text="Unique items crafted with care by local artisans."
            />
            <Feature
              emoji="🛡️"
              title="Secure Payments"
              text="Safe checkout and buyer protection for every order."
            />
            <Feature
              emoji="🚚"
              title="Reliable Delivery"
              text="Tracked shipping and smooth returns when needed."
            />
          </motion.div>
        </section>

        {/* ===== CATEGORIES (compact grid) ===== */}
        <section className="mb-10">
          <h3 className="text-2xl font-semibold mb-4 text-gray-900">
            Explore Categories
          </h3>
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4"
            initial="hidden"
            animate={loaded ? "visible" : "hidden"}
            variants={containerVariants}
          >
            <div>
              <a href="/search?query=Paintings">
                <CategoryCard title="Paintings" />
              </a>
            </div>
            <div>
              <a href="/search?query=Jewelry">
                <CategoryCard title="Jewelry" />
              </a>
            </div>
            <div>
              <a href="/search?query=Home Decor">
                <CategoryCard title="Home Decor" />
              </a>
            </div>
            <div>
              <a href="/search?query=Textiles">
                <CategoryCard title="Textiles" />
              </a>
            </div>
            <div>
              <a href="/search?query=WoodCraft">
                <CategoryCard title="WoodCraft" />
              </a>
            </div>
            <div>
              <a href="/search?query=Ceramics">
                <CategoryCard title="Ceramics" />
              </a>
            </div>
          </motion.div>
        </section>

        {/* ===== HOW IT WORKS (3-step vertical on mobile/horizontal on desktop) ===== */}
        <section className="mb-10">
          <h3 className="text-2xl font-semibold mb-4 text-gray-900">
            How it works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-lg bg-white/6 border-b-2 border-black">
              <h4 className="font-semibold">1. Browse</h4>
              <p className="text-sm text-gray-700 mt-2">
                Discover curated collections or search for something specific.
              </p>
            </div>
            <div className="p-5 rounded-lg bg-white/6 border-b-2 border-black">
              <h4 className="font-semibold">2. Support</h4>
              <p className="text-sm text-gray-700 mt-2">
                Buy directly from makers and support fair wages.
              </p>
            </div>
            <div className="p-5 rounded-lg bg-white/6 border-b-2 border-black">
              <h4 className="font-semibold">3. Enjoy</h4>
              <p className="text-sm text-gray-700 mt-2">
                Receive a unique item and share your story with others.
              </p>
            </div>
          </div>
        </section>

        {/* ===== TESTIMONIALS ===== */}
        <section className="mb-10">
          <h3 className="text-2xl font-semibold mb-4 text-gray-900">
            What buyers say
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Testimonial
              quote="Beautiful craftsmanship and quick delivery."
              author="Priya"
            />
            <Testimonial
              quote="I found a perfect gift for my friend."
              author="Rahul"
            />
            <Testimonial
              quote="Great communication with the seller."
              author="Anita"
            />
          </div>
        </section>

        {/* ===== TOP ARTISANS ===== */}
        <section className="mb-10">
          <h3 className="text-2xl font-semibold mb-4 text-gray-900">
            Top artisans
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Artisan name="Meera" skill="Textile Artist" />
            <Artisan name="Vikram" skill="Woodworker" />
            <Artisan name="Sana" skill="Ceramicist" />
            <Artisan name="Arjun" skill="Painter" />
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="mb-10 text-center">
          <div className="inline-block px-6 py-4 rounded-3xl bg-gradient-to-r from-primary to-secondary text-black font-semibold">
            Join the community — Shop handcrafted
          </div>
        </section>

        {/* ===== small footer credit (keeps everything in this file) ===== */}
        <footer className="pt-8 pb-6 text-center">
          <p className="text-md text-gray-700">
            © {new Date().getFullYear()} ArtistPoint
          </p>
          <p className="text-md text-gray-600 mt-1">
            Created by Dev Khare, Ajay Singh Tomar and Vikash Dhakar
          </p>
        </footer>
      </div>
    </LoopingAnimatedBackground>
  );
};

export default Hero;
