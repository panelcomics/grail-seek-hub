import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { SAMPLE_AUCTIONS } from "@/config/auctionConfig";
import { AuctionDetailContent } from "@/components/auction/AuctionDetailContent";

export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  
  // In preview mode, find from sample data
  const auction = SAMPLE_AUCTIONS.find((a) => a.id === id) ?? SAMPLE_AUCTIONS[0];

  return (
    <>
      <Helmet>
        <title>{`${auction.title} ${auction.issue} — Auction Preview | GrailSeeker`}</title>
        <meta
          name="description"
          content={`Preview auction for ${auction.title} ${auction.issue} — ${auction.certification} ${auction.grade}. Bidding opens soon on GrailSeeker.`}
        />
      </Helmet>
      <AuctionDetailContent auction={auction} />
    </>
  );
}
