import { describe, expect, it } from "vitest";
import { CAMPANAS_GOOGLE_ADS, camposDeCampana, nombreCampana, nombreCampanaCorto, vieneDeGoogleAds } from "./campanas";

describe("campaña de Google Ads", () => {
  it("toma de la URL de llegada el ID de campaña, gbraid/wbraid y utm_*, y descarta basura", () => {
    expect(
      camposDeCampana({
        gad_campaignid: "23187654321",
        gad_source: "1",
        gbraid: "0AAAA",
        utm_campaign: "pmax-leads",
        utm_term: "",
        otro: "x",
      }),
    ).toEqual({ campanaId: "23187654321", gbraid: "0AAAA", utmCampaign: "pmax-leads" });
    expect(camposDeCampana({ gad_campaignid: "123<script>" })).toEqual({});
    expect(camposDeCampana({ utm_campaign: 5 })).toEqual({});
    expect(camposDeCampana(null)).toEqual({});
    expect(camposDeCampana({ utm_campaign: "x".repeat(500) }).utmCampaign).toHaveLength(200);
  });

  it("un clic de iPhone (gbraid) o con ID de campaña cuenta como Google Ads aunque no traiga gclid", () => {
    expect(vieneDeGoogleAds(undefined, { gbraid: "0AAAA" })).toBe(true);
    expect(vieneDeGoogleAds(undefined, { campanaId: "1" })).toBe(true);
    expect(vieneDeGoogleAds("Cj0", {})).toBe(true);
    expect(vieneDeGoogleAds(undefined, { utmCampaign: "x" })).toBe(false);
  });

  it("muestra el nombre de la tabla, si no el utm, si no el ID", () => {
    CAMPANAS_GOOGLE_ADS["111"] = "Isapre Nueva - PMax - Leads Chile";
    expect(nombreCampana({ campanaId: "111", utmCampaign: "otra" })).toBe("Isapre Nueva - PMax - Leads Chile");
    expect(nombreCampanaCorto({ campanaId: "111" })).toBe("PMax - Leads Chile");
    expect(nombreCampana({ campanaId: "999", utmCampaign: "search-hot-buyer" })).toBe("search-hot-buyer");
    expect(nombreCampana({ campanaId: "999" })).toBe("Campaña 999");
    expect(nombreCampana({})).toBeUndefined();
    delete CAMPANAS_GOOGLE_ADS["111"];
  });
});
