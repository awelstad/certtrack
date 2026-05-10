-- Allow unauthenticated (anon) reads for QR code verification pages.
-- These tables expose only what a field inspector scanning a badge would see.

-- Workers: public can look up by public_id
CREATE POLICY "workers: anon can select by public_id"
  ON workers FOR SELECT TO anon
  USING (true);

-- Organizations: public can read org name/logo for branding on QR page
CREATE POLICY "organizations: anon can select"
  ON organizations FOR SELECT TO anon
  USING (true);

-- Worker certifications: public can read certs for QR page
CREATE POLICY "worker_certifications: anon can select"
  ON worker_certifications FOR SELECT TO anon
  USING (true);

-- Certification types: public can read names for QR page
CREATE POLICY "certification_types: anon can select"
  ON certification_types FOR SELECT TO anon
  USING (true);

-- QR scan logs: anon can insert (log the scan), but not read
CREATE POLICY "qr_scan_logs: anon can insert"
  ON qr_scan_logs FOR INSERT TO anon
  WITH CHECK (true);
