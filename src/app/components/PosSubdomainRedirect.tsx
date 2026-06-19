import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  isPosSubdomain,
  POS_SUBDOMAIN_HOME,
  shouldRedirectToPosHome,
} from "../lib/posSubdomain";

/** En elitegym247.pos.* redirige la raíz a /pos (Tienda). */
export function PosSubdomainRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPosSubdomain()) return;
    if (shouldRedirectToPosHome(location.pathname)) {
      navigate(POS_SUBDOMAIN_HOME, { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}
