import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.modules.pipeline.repository import PipelineRepository
from app.modules.pipeline.service import PipelineService
from app.modules.pipeline.schemas import OpportunityCreate, OpportunityUpdateStage

def test_opportunity():
    print("==================================================")
    print("TESTING OPPORTUNITY PERSISTENCE IN SUPABASE")
    print("==================================================")
    
    repo = PipelineRepository()
    service = PipelineService(repo)
    
    test_data = OpportunityCreate(
        title="Opportunity - Test Enterprise Deal",
        company="Enterprise Alpha Corp",
        customer_name="Enterprise Alpha Corp",
        expected_revenue=550000.0,
        value=550000.0,
        stage="Lead",
        probability=40,
        rep="Sales Executive",
        assigned_to="Sales Executive",
        assigned_to_email="executive@tconnect.com",
        notes="Automated test for Supabase opportunities table"
    )
    
    created = service.create_opportunity(test_data, "exec_001")
    print("[PASS] Opportunity Created:", created)
    
    opp_id = created.get("id") or created.get("opportunity_id")
    assert opp_id, "Opportunity must have an ID"
    
    # Test stage update
    updated = service.update_stage(opp_id, OpportunityUpdateStage(stage="Qualified", probability=60))
    print("[PASS] Opportunity Stage Updated:", updated)
    
    # Test fetching list
    all_opps = service.list_opportunities()
    print(f"[PASS] Total Opportunities in System: {len(all_opps)}")
    found = any(str(o.get("id")) == str(opp_id) or str(o.get("opportunity_id")) == str(opp_id) for o in all_opps)
    assert found, f"Created opportunity {opp_id} must be in listed opportunities"
    
    print("\n==================================================")
    print("ALL OPPORTUNITY TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_opportunity()
