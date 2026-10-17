import React, { useState } from "react";
import CountrySelect from "./CountrySelect";
import { crossings, crossingKeys } from "../shared/crossings";
export default function ShipmentRoute({ t, initial }) {
  const [type, setType] = useState(initial?.transportType || "crossBorder"),
    [direction, setDirection] = useState(
      initial?.transportType === "crossBorder" && initial.originCountry === "SY" ? "SY-TR" : "TR-SY",
    );
  const countries =
    type === "domesticTR" ? ["TR", "TR"] : type === "domesticSY" ? ["SY", "SY"] : direction.split("-");
  return (
    <>
      <label className="field">
        <span>{t("transportType")}</span>
        <select name="transportType" value={type} onChange={(e) => setType(e.target.value)}>
          {["domesticTR", "domesticSY", "crossBorder", "international"].map((k) => (
            <option key={k} value={k}>
              {t(k)}
            </option>
          ))}
        </select>
      </label>
      {type === "international" ? (
        <>
          <CountrySelect t={t} label="originCountry" name="originCountry" />
          <CountrySelect t={t} label="destinationCountry" name="destinationCountry" />
        </>
      ) : (
        <>
          <input type="hidden" name="originCountry" value={countries[0]} />
          <input type="hidden" name="destinationCountry" value={countries[1]} />
          {type === "crossBorder" ? (
            <label className="field">
              <span>{t("routeDirection")}</span>
              <select value={direction} onChange={(e) => setDirection(e.target.value)}>
                <option value="TR-SY">{t("turkeyToSyria")}</option>
                <option value="SY-TR">{t("syriaToTurkey")}</option>
              </select>
            </label>
          ) : (
            <p className="notice">{t("domesticRouteNote")}</p>
          )}
        </>
      )}
      {type === "crossBorder" && (
        <label className="field">
          <span>{t("crossing")}</span>
          <select name="crossing" required defaultValue={initial?.crossing || undefined}>
            {crossingKeys.map((k) => (
              <option key={k} value={k}>
                {t(k)}
                {crossings[k].status !== "open" ? " — " + t("crossing_" + crossings[k].status) : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      {type === "crossBorder" && <p className="notice small">{t("stagedOrderNote")}</p>}
    </>
  );
}
