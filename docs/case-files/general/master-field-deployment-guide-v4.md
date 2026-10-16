# Master Field Deployment & Developer Review Guide v4.0: Script Mapping & Source Integration Protocol

## 1. Version Control & Developer Code Review Protocol

Maintaining rigorous software traceability and multi-agent development safety requires standardized code annotation and version control practices. When multiple autonomous AI agents or software engineers collaborate on complex Search and Rescue (SAR) software systems, untracked changes, silent code deletions, and ambiguous merge resolutions introduce critical system regressions.

To prevent code loss and streamline developer code reviews, all scripts across the project infrastructure must adhere to the following mandatory development directives:

### 1.1 Mandatory Script Header Block
Every executable script or module must open with a comprehensive version control header containing:
* **Version Identification:** Incremental version number (e.g., ).
* **Release Timestamp:** ISO-8601 date of publication (e.g., ).
* **Author / Agent Identifier:** Unique identifier of the author or AI agent instance (e.g., ).
* **Merge Conflict & Branch Status:** Explicit status marking (e.g.,  or ).
* **Revision Change Matrix:** Comprehensive bulleted log documenting every architectural modification from  to the current release.

### 1.2 Obsolete Code Retention Rule (Comment-Out Policy)
**Obsolete or deprecated code must never be deleted.** Deleting legacy functions obscures historical reasoning and prevents rapid rollbacks during field deployments. When refactoring or replacing functions:
1. Retain the legacy function or code block in its exact historical location.
2. Comment out the block completely using standard python comments ().
3. Prefix the commented block with an explicit version and deprecation tag, for example:
   
   

### 1.3 Instance-Level Code Annotations
Every modified line, newly added method, or integrated API handler must be annotated inline at the exact point of modification. Use standardized tag formats:
*  for new classes, functions, or dictionary entries.
*  for modified signatures or refactored logic.
*  to explicitly flag resolved current/incoming code branches.

---

## 2. Ingested Link Source & Script Handler Mapping Matrix

The engine maps every ingested web resource, government portal, and open-data API in the project repository directly to executable Python handlers in .

The table below outlines the complete mapping of all primary external link sources:

| Source Identifier | External Source URL | Functional Category | Mapped Script Handler () | Primary Data Output |
| :--- | :--- | :--- | :--- | :--- |
| **USGS_LIDAR_FAQ_3DEP** | https://www.usgs.gov/faqs/what-lidar-data-and-where-can-i-download-it | LiDAR / Topography |  | 3DEP 1-Meter LAZ / DEM Point Clouds |
| **CANADIAN_LIDAR_NRCAN** | https://open.canada.ca/data/en/dataset | LiDAR / Alpine SAR |  | High-Res Bare-Earth DEM Tiles |
| **WAYBACK_CDX_API** | https://web.archive.org/cdx/search/cdx | OSINT / Historical Web |  | Historical Web Snapshot Metadata |
| **OPEN_TRAFFIC_CAM_MAP** | https://github.com/AidanWelch/OpenTrafficCamMap | CCTV / Surveillance |  | Public Traffic Camera GeoJSON & Streams |
| **CROMA_MCP_SERVER** | https://usecroma.com/en/mcp | MCP / Public Records |  | Government & Municipal GIS Data |
| **FIRECRAWL_MCP_SERVER** | https://github.com/firecrawl/firecrawl-mcp-server | MCP / Web Scraping |  | Automated Web Page Scraping Payload |
| **WEB_RESEARCHER_MCP** | https://github.com/zoharbabin/web-researcher-mcp | MCP / Citation Research |  | Verified Source Citation Summaries |
| **EMBEDEARTH_PLUMBING_PERMITS** | https://huggingface.co/datasets/EmbedEarth/plumbing-permits | ML / Subsurface GIS |  | Plumbing & Drainage Permit Datasets |

---

## 3. System Toolkit & Execution Architecture

The core codebase is deployed across two primary Python modules:

### 3.1 
This module serves as the primary Agent-to-Agent (A2A) ingestion engine. It connects municipal permit registries, USGS 3DEP LiDAR downloads, Canadian alpine LiDAR tiles, Wayback CDX historical web queries, and public CCTV streams into a unified JSON interface.

* **Command-Line Interface:**
  *  : Executes USGS 3DEP National Map elevation query.
  *  : Generates Franklin County PIN and municipal permit search parameters.
  *  : Queries the Internet Archive CDX server for historical web snapshots.

### 3.2 
This module handles video surveillance automation and forensic video auditing:
* **RTSPStreamHandler:** Live RTSP/NVR camera stream ingestion and snapshot capture.
* **ONVIFController:** Pan-Tilt-Zoom (PTZ) network camera steering over ONVIF SOAP interfaces.
* **CCTVMotionDetector:** MOG2 background subtraction motion anomaly logging in user-defined Regions of Interest (ROI).
* **CCTVForensicAuditor:** Frame-by-frame metadata integrity verification and recording gap detection.

---

## 4. Code Review & Worked Developer Guidelines

To demonstrate how the developer versioning policy is implemented in practice, the following code snippet from  illustrates the header format, obsolete code retention, and instance-level version tagging:


