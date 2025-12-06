import LoopingAnimatedBackground from "./LoopingAnimatedBackground";
import Slider from "react-slick"; // Import Slider
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import imgage1 from "../../assets/hero/fabrics.avif";
import image2 from "../../assets/hero/glassworks.avif";
import image3 from "../../assets/hero/leather.webp";
import image4 from "../../assets/hero/potmaking.avif";
import image5 from "../../assets/hero/woodcraft.avif";

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

const Hero = ({ handleOrderPopup }) => {
  var settings = {
    dots: false,
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

  return (
    <LoopingAnimatedBackground
      speed={28}
      mobileSpeed={18}
      opacity={0.20}
      mobileOpacity={0.1}
      colors={["#FFa64d", "#FCA311"]}
      density={5}
    >
      {/* hero section */}
      <div className="container mx-auto px-24 py-32">
        <Slider {...settings}>
          {imageList.map((data) => (
            <div key={data.id}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-32 rounded-xl">
                {/* text content section */}
                <div className="flex flex-col grid-cols-subgrid justify-center w-[450px] gap-4 items-center text-center z-10">
                  <h1
                    data-aos="zoom-out"
                    data-aos-duration="500"
                    data-aos-once="true"
                    className="text-5xl sm:text-6xl lg:text-7xl order-1 sm:order-1 font-bold text-black"
                  >
                    {data.title}
                  </h1>
                  <p
                    data-aos="fade-up"
                    data-aos-duration="500"
                    data-aos-delay="100"
                    className="text-md sm:text-lg order-2 sm:order-2 text-black"
                  >
                    {data.desc}
                  </p>
                  <div
                    data-aos="fade-up"
                    data-aos-duration="500"
                    data-aos-delay="300"
                    className="order-3 sm:order-3"
                  >
                    <button
                      onClick={handleOrderPopup || (() => {})}
                      className="text-sm sm:text-md bg-gradient-to-r from-primary to-secondary hover:scale-105 duration-200 text-black py-2 px-4 rounded-full"
                    >
                      Order Now
                    </button>
                  </div>
                </div>
                {/* image section */}
                <div className="order-1 sm:order-2 grid-cols-subgrid">
                  <div
                    data-aos="zoom-in"
                    data-aos-once="true"
                    className="z-10 overflow-hidden"
                  >
                    <img
                      src={data.img}
                      alt={data.title}
                      className="rounded-xl w-[300px] h-[300px] sm:h-[450px] sm:w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </LoopingAnimatedBackground>
  );
};

export default Hero;
