/** @type {import('next').NextConfig}*/
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "rvskills-videos-990965457285.s3.ap-south-1.amazonaws.com",
                pathname: "/thumbnails/**",
            },
        ],
    },
};

module.exports = nextConfig;